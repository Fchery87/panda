import { describe, expect, it } from 'bun:test'
import type { SetStateAction } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import { SpecPersistenceState } from '../lib/agent/spec/persistence'
import type { FormalSpecification } from '../lib/agent/spec/types'
import { applyNonTerminalAgentEvent, type EventApplierMutableState } from './useAgent-event-applier'
import type { Message } from './useMessageHistory'
import type { UsageTotals } from './useTokenUsageMetrics'
import type { PersistedRunEventInfo, TokenSource, ToolCallInfo } from '@/components/chat/types'

function createState<T>(initial: T) {
  let current = initial
  return {
    get: () => current,
    set: (update: SetStateAction<T>) => {
      current = typeof update === 'function' ? (update as (prev: T) => T)(current) : update
    },
  }
}

function createSpec(): FormalSpecification {
  const now = Date.now()
  return {
    id: 'spec-1',
    version: 1,
    tier: 'explicit',
    status: 'draft',
    intent: {
      goal: 'Ship the feature',
      rawMessage: 'Ship the feature',
      constraints: [],
      acceptanceCriteria: [],
    },
    plan: {
      steps: [],
      dependencies: [],
      risks: [],
      estimatedTools: [],
    },
    validation: {
      preConditions: [],
      postConditions: [],
      invariants: [],
    },
    provenance: {
      model: 'test-model',
      promptHash: 'hash',
      timestamp: now,
      chatId: 'chat-1',
      runId: 'run-1',
    },
    verificationResults: [],
    createdAt: now,
    updatedAt: now,
  }
}

function createMutableState(): EventApplierMutableState {
  return {
    assistantContent: '',
    assistantReasoning: '',
    assistantToolCalls: [],
    replaceOnNextText: false,
    rewriteNoticeShown: false,
    runUsage: {
      promptTokens: 10,
      completionTokens: 0,
      totalTokens: 10,
      source: 'estimated',
    },
  }
}

function createBaseArgs(overrides: Partial<Parameters<typeof applyNonTerminalAgentEvent>[0]> = {}) {
  const statusState = createState<
    'idle' | 'thinking' | 'streaming' | 'executing_tools' | 'complete' | 'error'
  >('idle')
  const iterationState = createState(0)
  const runUsageState = createState<(UsageTotals & { source: TokenSource }) | undefined>(undefined)
  const progressStepsState = createState<any[]>([])
  const pendingSpecState = createState<FormalSpecification | null>(null)
  const currentSpecState = createState<FormalSpecification | null>(null)
  const toolCallsState = createState<ToolCallInfo[]>([])
  const messagesState = createState<Message[]>([
    {
      id: 'assistant-1',
      role: 'assistant',
      content: 'Existing assistant content',
      createdAt: Date.now(),
      mode: 'build',
      toolCalls: [],
      annotations: { mode: 'build' },
    },
  ])
  const appendRunEvents: PersistedRunEventInfo[] = []
  let paintCount = 0

  const args: Parameters<typeof applyNonTerminalAgentEvent>[0] = {
    event: { type: 'thinking' },
    mode: 'build',
    assistantMessageId: 'assistant-1',
    projectId: 'project-1' as Id<'projects'>,
    chatId: 'chat-1' as Id<'chats'>,
    runId: 'run-1' as Id<'agentRuns'>,
    planningSessionId: null,
    planSteps: ['Review requirements', 'Implement feature'],
    completedPlanStepIndexesRef: { current: [] },
    specPersistence: new SpecPersistenceState(),
    runtimeSettings: { showReasoningPanel: true },
    mutable: createMutableState(),
    estimateCompletionTokens: (content) => content.length,
    appendRunEvent: async (event) => {
      appendRunEvents.push(event)
    },
    createSpec: async () => 'spec-convex-1' as Id<'specifications'>,
    attachVerification: async () => undefined,
    updateSpec: async () => undefined,
    setStatus: statusState.set,
    setCurrentIteration: iterationState.set,
    setCurrentRunUsage: runUsageState.set,
    setProgressSteps: progressStepsState.set,
    setPendingSpec: pendingSpecState.set,
    setCurrentSpec: currentSpecState.set,
    setToolCalls: toolCallsState.set,
    setMessages: messagesState.set,
    schedulePaint: () => {
      paintCount += 1
    },
    ...overrides,
  }

  return {
    args,
    statusState,
    iterationState,
    runUsageState,
    progressStepsState,
    pendingSpecState,
    currentSpecState,
    toolCallsState,
    messagesState,
    appendRunEvents,
    getPaintCount: () => paintCount,
  }
}

describe('applyNonTerminalAgentEvent', () => {
  it('handles thinking events and tracks iterations', () => {
    const harness = createBaseArgs({
      event: {
        type: 'status_thinking',
        content: 'Iteration 3: planning next step',
      },
    })

    const handled = applyNonTerminalAgentEvent(harness.args)

    expect(handled).toBe(true)
    expect(harness.statusState.get()).toBe('thinking')
    expect(harness.iterationState.get()).toBe(3)
    expect(harness.appendRunEvents).toEqual([
      {
        type: 'status',
        content: 'Iteration 3: planning next step',
        status: 'thinking',
      },
    ])
  })

  it('handles text replacement and updates mutable streaming state', () => {
    const harness = createBaseArgs({
      event: {
        type: 'text',
        content: 'Fresh rewrite output',
      },
      mutable: {
        ...createMutableState(),
        replaceOnNextText: true,
        assistantContent: 'Old output',
      },
    })

    const handled = applyNonTerminalAgentEvent(harness.args)

    expect(handled).toBe(true)
    expect(harness.statusState.get()).toBe('streaming')
    expect(harness.args.mutable.replaceOnNextText).toBe(false)
    expect(harness.args.mutable.assistantContent).toBe('Fresh rewrite output')
    expect(harness.runUsageState.get()).toMatchObject({
      promptTokens: 10,
      completionTokens: 'Fresh rewrite output'.length,
      totalTokens: 10 + 'Fresh rewrite output'.length,
      source: 'estimated',
    })
    expect(harness.messagesState.get()[0]).toMatchObject({
      content: '',
      reasoningContent: '',
      mode: 'build',
      toolCalls: [],
    })
    expect(harness.getPaintCount()).toBe(1)
  })

  it('handles tool call and tool result events', () => {
    const harness = createBaseArgs({
      event: {
        type: 'tool_call',
        toolCall: {
          id: 'tool-1',
          type: 'function',
          function: {
            name: 'read_files',
            arguments: JSON.stringify({ paths: ['README.md'] }),
          },
        },
      },
    })

    const handledCall = applyNonTerminalAgentEvent(harness.args)

    expect(handledCall).toBe(true)
    expect(harness.statusState.get()).toBe('executing_tools')
    expect(harness.toolCallsState.get()).toHaveLength(1)
    expect(harness.messagesState.get()[0]?.toolCalls).toHaveLength(1)
    expect(harness.appendRunEvents[0]).toMatchObject({
      type: 'tool_call',
      toolCallId: 'tool-1',
      toolName: 'read_files',
      status: 'pending',
    })

    harness.args.event = {
      type: 'tool_result',
      toolResult: {
        toolCallId: 'tool-1',
        toolName: 'read_files',
        args: { paths: ['README.md'] },
        output: 'file contents',
        durationMs: 5,
        timestamp: Date.now(),
        retryCount: 0,
      },
    }

    const handledResult = applyNonTerminalAgentEvent(harness.args)

    expect(handledResult).toBe(true)
    expect(harness.toolCallsState.get()[0]).toMatchObject({
      status: 'completed',
      result: { output: 'file contents', durationMs: 5 },
    })
    expect(harness.messagesState.get()[0]?.toolCalls?.[0]).toMatchObject({
      status: 'completed',
    })
    expect(harness.appendRunEvents[1]).toMatchObject({
      type: 'tool_result',
      toolCallId: 'tool-1',
      toolName: 'read_files',
      output: 'file contents',
      status: 'completed',
    })
  })

  it('persists pending approval specs and updates spec state', async () => {
    const spec = createSpec()
    const harness = createBaseArgs({
      event: {
        type: 'spec_pending_approval',
        spec,
      },
    })

    const handled = applyNonTerminalAgentEvent(harness.args)
    await Promise.resolve()

    expect(handled).toBe(true)
    expect(harness.statusState.get()).toBe('idle')
    expect(harness.pendingSpecState.get()).toBe(spec)
    expect(harness.currentSpecState.get()).toBe(spec)
    expect(harness.appendRunEvents[0]).toMatchObject({
      type: 'spec_pending_approval',
      content: 'Ship the feature',
      status: 'draft',
    })
    expect(harness.args.specPersistence.get('spec-1')).toBe('spec-convex-1')
  })

  it('returns false for terminal events', () => {
    const harness = createBaseArgs({
      event: {
        type: 'complete',
        usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
      },
    })

    const handled = applyNonTerminalAgentEvent(harness.args)

    expect(handled).toBe(false)
    expect(harness.appendRunEvents).toHaveLength(0)
  })
})
