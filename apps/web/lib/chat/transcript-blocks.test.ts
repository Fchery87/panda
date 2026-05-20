import { describe, expect, test } from 'bun:test'
import {
  buildAssistantMessageTranscriptBlocks,
  buildTranscriptFeedItems,
} from './transcript-blocks'
import {
  getSurfacedTranscriptModePolicies,
  getTranscriptModePolicy,
  mapRunEventToSurface,
} from './transcript-policy'
import type { Message } from '@/components/chat/types'
import type { ExecutionReceipt } from '@/lib/agent/receipt'

function receipt(overrides: Partial<ExecutionReceipt> = {}): ExecutionReceipt {
  return {
    version: 1,
    mode: 'code',
    agent: 'build',
    requestedMode: 'code',
    resolvedMode: 'code',
    routingDecision: {
      requestedMode: 'code',
      resolvedMode: 'code',
      agent: 'build',
      source: 'deterministic_rules',
      confidence: 'high',
      rationale: 'Code changes requested.',
      requiresApproval: false,
      webcontainerRequired: false,
      suggestedSkills: [],
    },
    providerModel: 'test:model',
    contextSources: {
      filesConsidered: [],
      filesLoaded: [],
      filesExcluded: [],
      memoryBankIncluded: false,
      specIncluded: false,
      planIncluded: false,
      sessionSummaryIncluded: false,
      compactionOccurred: false,
      truncated: false,
    },
    nativeExecution: {
      filesRead: [],
      toolsUsed: [],
      approvalsRequested: [],
      truncated: false,
    },
    webcontainer: {
      used: true,
      filesWritten: ['apps/web/components/chat/MessageList.tsx'],
      commandsRun: [{ command: 'bun test apps/web/components/chat', redacted: false }],
      truncated: false,
    },
    tokens: { input: 10, output: 5, cached: 0 },
    durationMs: 300,
    resultStatus: 'complete',
    ...overrides,
  }
}

function makeToolStep(
  id: string,
  content: string,
  toolName: string,
  filePaths: string[] = [],
  status: 'completed' | 'error' | 'running' = 'completed'
) {
  return {
    id,
    content,
    status,
    category: 'tool' as const,
    details: {
      toolName,
      targetFilePaths: filePaths,
      durationMs: 120,
    },
    createdAt: 260,
  }
}

describe('transcript blocks', () => {
  test('builds assistant message blocks for reasoning and text only', () => {
    const message: Message = {
      _id: 'assistant-1',
      role: 'assistant',
      content: 'Implemented the panel wiring.',
      reasoningContent: 'Inspecting the panel, then mapping role labels.',
      toolCalls: [
        {
          id: 'tool-1',
          name: 'read_files',
          args: { paths: ['apps/web/components/chat/MessageList.tsx'] },
          status: 'completed',
          result: {
            output: 'ok',
            durationMs: 42,
          },
        },
      ],
      annotations: {
        mode: 'build',
      },
      createdAt: 100,
    }

    expect(buildAssistantMessageTranscriptBlocks(message)).toEqual([
      expect.objectContaining({ kind: 'thinking_teaser' }),
      expect.objectContaining({ kind: 'assistant_text' }),
    ])
  })

  test('builds unavailable Thinking block from reasoning tokens without summary', () => {
    const message: Message = {
      _id: 'assistant-1',
      role: 'assistant',
      content: 'The implementation is complete.',
      annotations: {
        mode: 'build',
        reasoningTokens: 2400,
      },
      createdAt: 100,
    }

    expect(buildAssistantMessageTranscriptBlocks(message)).toEqual([
      expect.objectContaining({
        kind: 'thinking_redacted',
        content: 'Thinking used · summary unavailable · 2,400 tokens',
      }),
      expect.objectContaining({ kind: 'assistant_text' }),
    ])
  })

  test('returns transcript messages without operational tail items for plan mode', () => {
    const messages: Message[] = [
      {
        _id: 'user-1',
        role: 'user',
        content: 'Refactor the transcript.',
        createdAt: 100,
      },
      {
        _id: 'assistant-1',
        role: 'assistant',
        content: 'Working on it.',
        annotations: { mode: 'build' },
        createdAt: 200,
      },
    ]

    const items = buildTranscriptFeedItems({
      messages,
      chatMode: 'plan',
      isStreaming: true,
      liveSteps: [
        {
          id: 'step-1',
          content: 'Mapped transcript event blocks',
          status: 'running',
          category: 'analysis',
          createdAt: 250,
        },
      ],
      runEvents: [
        {
          _id: 'event-1',
          runId: 'run-1',
          type: 'snapshot',
          contentPreview: 'Snapshot saved',
          snapshot: {
            hash: 'abc123',
            step: 1,
            files: ['apps/web/components/chat/MessageList.tsx'],
            timestamp: 260,
          },
          createdAt: 260,
        },
      ],
      pendingSpec: {
        id: 'spec-1',
        version: 1,
        tier: 'explicit',
        status: 'draft',
        intent: {
          goal: 'Keep the harness stable while refactoring the transcript',
          userMessage: 'Refactor the transcript',
          constraints: [],
          acceptanceCriteria: [],
        },
        plan: {
          steps: [],
          files: [],
        },
        createdAt: 0,
        updatedAt: 0,
      } as never,
      planStatus: 'approved',
    })

    // Plan mode: no tool chips (plan mode doesn't do tool calls), no plan
    // checklist (no planDraft provided).
    expect(items.map((item) => item.type)).toEqual(['message', 'message'])
  })

  test('code and build modes no longer emit milestone summaries in chat', () => {
    const messages: Message[] = [
      {
        _id: 'assistant-1',
        role: 'assistant',
        content: 'Working on it.',
        annotations: { mode: 'build' },
        createdAt: 200,
      },
    ]

    const items = buildTranscriptFeedItems({
      messages,
      chatMode: 'code',
      runEvents: [
        {
          _id: 'event-1',
          type: 'progress_step',
          contentPreview: 'Tool completed: write_files',
          status: 'completed',
          progressCategory: 'tool',
          progressToolName: 'write_files',
          targetFilePaths: ['apps/web/components/chat/MessageList.tsx'],
          createdAt: 260,
        },
        {
          _id: 'event-2',
          type: 'progress_step',
          contentPreview: 'Tool completed: run_command',
          status: 'completed',
          progressCategory: 'tool',
          progressToolName: 'run_command',
          createdAt: 300,
        },
        {
          _id: 'event-3',
          type: 'progress_step',
          contentPreview: 'Run complete',
          status: 'completed',
          progressCategory: 'complete',
          createdAt: 340,
        },
      ],
      latestRunReceipt: receipt(),
      userIntent: 'Refactor the transcript.',
    })

    // milestone_summaries removed — only the message + tool chips appear.
    const blockItems = items.filter((item) => item.type === 'block')
    // The tool chips block should be there (2 completed tool steps)
    expect(blockItems.length).toBeGreaterThanOrEqual(1)
    const toolChipBlock = blockItems.find(
      (item) => item.type === 'block' && 'kind' in item.block && item.block.kind === 'tool_chips'
    )
    expect(toolChipBlock).toBeDefined()
  })

  test('builds tool chips for code mode with grouped tool calls', () => {
    const messages: Message[] = [
      {
        _id: 'assistant-1',
        role: 'assistant',
        content: 'Done.',
        annotations: { mode: 'code' },
        createdAt: 200,
      },
    ]

    const items = buildTranscriptFeedItems({
      messages,
      chatMode: 'code',
      liveSteps: [
        makeToolStep('s1', 'Wrote MessageList.tsx', 'write_files', [
          'apps/web/components/chat/MessageList.tsx',
        ]),
        makeToolStep('s2', 'Wrote types.ts', 'write_files', [
          'apps/web/components/chat/types.ts',
        ]),
        makeToolStep('s3', 'Ran tests', 'run_command', []),
      ],
    })

    const blockItems = items.filter((item) => item.type === 'block')
    const toolChipItem = blockItems.find(
      (item) => item.type === 'block' && 'kind' in item.block && item.block.kind === 'tool_chips'
    )
    expect(toolChipItem).toBeDefined()

    if (toolChipItem && toolChipItem.type === 'block') {
      const block = toolChipItem.block
      if (block.kind === 'tool_chips') {
        // Should have at least "Edited" and "Ran" groups
        expect(block.groups.length).toBeGreaterThanOrEqual(2)
        expect(block.entries.length).toBe(3)
        const editGroup = block.groups.find((g) => g.label === 'Edited')
        expect(editGroup).toBeDefined()
        expect(editGroup!.count).toBe(2)
        const commandGroup = block.groups.find((g) => g.label === 'Ran')
        expect(commandGroup).toBeDefined()
        expect(commandGroup!.count).toBe(1)
      }
    }
  })

  test('does not build tool chips for plan or ask mode', () => {
    const messages: Message[] = [
      {
        _id: 'assistant-1',
        role: 'assistant',
        content: 'Planning.',
        annotations: { mode: 'plan' },
        createdAt: 200,
      },
    ]

    const items = buildTranscriptFeedItems({
      messages,
      chatMode: 'plan',
      liveSteps: [
        makeToolStep('s1', 'Read file', 'read_files', ['src/app.ts']),
      ],
    })

    const blockItems = items.filter((item) => item.type === 'block')
    const hasToolChips = blockItems.some(
      (item) => item.type === 'block' && 'kind' in item.block && item.block.kind === 'tool_chips'
    )
    expect(hasToolChips).toBe(false)
  })

  test('builds plan checklist when planDraft is provided', () => {
    const messages: Message[] = [
      {
        _id: 'assistant-1',
        role: 'assistant',
        content: 'Working on it.',
        annotations: { mode: 'build' },
        createdAt: 200,
      },
    ]

    const planDraft = `## Implementation Plan

1. Analyze existing component structure
2. Refactor the panel wiring
3. Add tests for new behavior
4. Verify all tests pass`

    const items = buildTranscriptFeedItems({
      messages,
      chatMode: 'build',
      planDraft,
      liveSteps: [
        {
          id: 's1',
          content: 'Analyze existing component structure',
          status: 'completed',
          category: 'analysis',
          createdAt: 250,
        },
        {
          id: 's2',
          content: 'Refactor the panel wiring',
          status: 'running',
          category: 'tool',
          createdAt: 300,
        },
      ],
    })

    const blockItems = items.filter((item) => item.type === 'block')
    const checklistItem = blockItems.find(
      (item) => item.type === 'block' && 'kind' in item.block && item.block.kind === 'plan_checklist'
    )
    expect(checklistItem).toBeDefined()

    if (checklistItem && checklistItem.type === 'block') {
      const block = checklistItem.block
      if (block.kind === 'plan_checklist') {
        expect(block.totalCount).toBe(4)
        expect(block.steps.length).toBe(4)
        // Step 1 should be completed, step 2 should be active or completed
        expect(block.steps[0].title).toBe('Analyze existing component structure')
      }
    }
  })

  test('does not build plan checklist when no planDraft is provided', () => {
    const messages: Message[] = [
      {
        _id: 'assistant-1',
        role: 'assistant',
        content: 'Working on it.',
        annotations: { mode: 'build' },
        createdAt: 200,
      },
    ]

    const items = buildTranscriptFeedItems({
      messages,
      chatMode: 'build',
    })

    const blockItems = items.filter((item) => item.type === 'block')
    const hasChecklist = blockItems.some(
      (item) => item.type === 'block' && 'kind' in item.block && item.block.kind === 'plan_checklist'
    )
    expect(hasChecklist).toBe(false)
  })

  test('maps tool and progress events to inspector surface', () => {
    expect(mapRunEventToSurface({ type: 'tool_call' })).toBe('inspector')
    expect(mapRunEventToSurface({ type: 'progress_step', progressCategory: 'analysis' })).toBe(
      'inspector'
    )
    expect(mapRunEventToSurface({ type: 'snapshot' })).toBe('inspector')
  })

  test('defines plan mode transcript policy with clean chat output', () => {
    const policy = getTranscriptModePolicy('plan')

    expect(policy.chatAllows).toEqual(['messages', 'reasoning'])
    expect(policy.inspectorOwns).toContain('tool_calls')
    expect(policy.inspectorOwns).toContain('progress_steps')
    expect(policy.inspectorOwns).toContain('snapshots')
  })

  test('exposes surfaced Panda transcript modes as Plan, Code, and Build', () => {
    expect(getSurfacedTranscriptModePolicies().map((policy) => policy.surfaceLabel)).toEqual([
      'Plan',
      'Code',
      'Build',
    ])
  })
})
