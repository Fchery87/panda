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

  test('returns transcript messages without operational tail items', () => {
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

    expect(items.map((item) => item.type)).toEqual(['message', 'message'])
  })

  test('adds compact milestone summaries for Build transcript surfaces', () => {
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
    })

    expect(items.map((item) => item.type)).toEqual(['message', 'block', 'block', 'block'])
    expect(items[1]).toEqual(
      expect.objectContaining({
        type: 'block',
        block: expect.objectContaining({
          kind: 'execution_update',
          title: 'Updated files',
        }),
      })
    )
    expect(items[2]).toEqual(
      expect.objectContaining({
        type: 'block',
        block: expect.objectContaining({ title: 'Ran verification' }),
      })
    )
    expect(items[3]).toEqual(
      expect.objectContaining({
        type: 'block',
        block: expect.objectContaining({ title: 'Completed run' }),
      })
    )
  })

  test('maps tool and progress events to inspector surface', () => {
    expect(mapRunEventToSurface({ type: 'tool_call' })).toBe('inspector')
    expect(mapRunEventToSurface({ type: 'progress_step', progressCategory: 'analysis' })).toBe(
      'inspector'
    )
    expect(mapRunEventToSurface({ type: 'snapshot' })).toBe('inspector')
  })

  test('defines plan mode transcript policy around plan actions instead of trace rows', () => {
    const policy = getTranscriptModePolicy('plan')

    expect(policy.chatAllows).toContain('plan_actions')
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
