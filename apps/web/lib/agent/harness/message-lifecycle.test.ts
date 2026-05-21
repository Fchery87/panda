import { describe, expect, test } from 'bun:test'
import {
  isAssistantMessageStartingRuntimeEvent,
  mapRuntimeEventToAssistantMessageLifecycleEvent,
} from './message-lifecycle'
import type { RuntimeEvent } from './runtime-types'

const base = {
  messageId: 'assistant-1',
  runId: 'run-1',
}

describe('assistant message lifecycle contract', () => {
  test('marks the first assistant-producing runtime event as message start', () => {
    expect(
      mapRuntimeEventToAssistantMessageLifecycleEvent({
        ...base,
        hasStarted: false,
        event: { type: 'text', content: 'Hello' },
      })
    ).toEqual({
      type: 'assistant_message_started',
      messageId: 'assistant-1',
      runId: 'run-1',
    })
  })

  test('maps text and reasoning runtime events to message deltas after start', () => {
    expect(
      mapRuntimeEventToAssistantMessageLifecycleEvent({
        ...base,
        hasStarted: true,
        event: { type: 'text', content: 'Hello' },
      })
    ).toEqual({
      type: 'assistant_message_delta',
      messageId: 'assistant-1',
      runId: 'run-1',
      delta: { kind: 'text', content: 'Hello' },
    })

    expect(
      mapRuntimeEventToAssistantMessageLifecycleEvent({
        ...base,
        hasStarted: true,
        event: { type: 'reasoning', reasoningContent: 'Checking files' },
      })
    ).toEqual({
      type: 'assistant_message_delta',
      messageId: 'assistant-1',
      runId: 'run-1',
      delta: { kind: 'reasoning', content: 'Checking files' },
    })
  })

  test('maps tool call and result runtime events to references', () => {
    const toolCall: RuntimeEvent = {
      type: 'tool_call',
      toolCall: {
        id: 'call-1',
        type: 'function',
        function: { name: 'read_file', arguments: '{"path":"a.ts"}' },
      },
    }

    expect(
      mapRuntimeEventToAssistantMessageLifecycleEvent({
        ...base,
        hasStarted: true,
        event: toolCall,
      })
    ).toEqual({
      type: 'assistant_message_delta',
      messageId: 'assistant-1',
      runId: 'run-1',
      delta: { kind: 'tool_call_ref', toolCallId: 'call-1', toolName: 'read_file' },
    })

    expect(
      mapRuntimeEventToAssistantMessageLifecycleEvent({
        ...base,
        hasStarted: true,
        event: {
          type: 'tool_result',
          toolResult: {
            toolCallId: 'call-1',
            toolName: 'read_file',
            args: { path: 'a.ts' },
            output: 'ok',
            durationMs: 12,
          },
        },
      })
    ).toEqual({
      type: 'assistant_message_delta',
      messageId: 'assistant-1',
      runId: 'run-1',
      delta: { kind: 'tool_result_ref', toolCallId: 'call-1', toolName: 'read_file', status: 'completed' },
    })
  })

  test('maps completion and error runtime events to terminal lifecycle events', () => {
    expect(
      mapRuntimeEventToAssistantMessageLifecycleEvent({
        ...base,
        hasStarted: true,
        currentContent: 'Done',
        event: { type: 'complete', usage: { input: 10, output: 5, reasoning: 2 } },
      })
    ).toEqual({
      type: 'assistant_message_completed',
      messageId: 'assistant-1',
      runId: 'run-1',
      content: 'Done',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, reasoningTokens: 2 },
    })

    expect(
      mapRuntimeEventToAssistantMessageLifecycleEvent({
        ...base,
        hasStarted: true,
        event: { type: 'error', error: 'Provider failed' },
      })
    ).toEqual({
      type: 'assistant_message_failed',
      messageId: 'assistant-1',
      runId: 'run-1',
      error: 'Provider failed',
    })
  })

  test('keeps non-message runtime events outside the assistant lifecycle', () => {
    expect(isAssistantMessageStartingRuntimeEvent({ type: 'status' })).toBe(false)
    expect(
      mapRuntimeEventToAssistantMessageLifecycleEvent({
        ...base,
        hasStarted: true,
        event: { type: 'status', content: 'Running tests' },
      })
    ).toBeNull()
  })
})
