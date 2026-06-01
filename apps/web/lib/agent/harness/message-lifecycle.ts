import type { RuntimeEvent } from './runtime-types'

export type AssistantMessageDelta =
  | { kind: 'text'; content: string }
  | { kind: 'reasoning'; content: string }
  | { kind: 'tool_call_ref'; toolCallId: string; toolName?: string }
  | {
      kind: 'tool_result_ref'
      toolCallId: string
      toolName?: string
      status: 'completed' | 'error'
    }

export type AssistantMessageUsage = {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  reasoningTokens?: number
}

export type AssistantMessageLifecycleEvent =
  | {
      type: 'assistant_message_started'
      messageId: string
      runId?: string
    }
  | {
      type: 'assistant_message_delta'
      messageId: string
      runId?: string
      delta: AssistantMessageDelta
    }
  | {
      type: 'assistant_message_completed'
      messageId: string
      runId?: string
      content: string
      usage?: AssistantMessageUsage
    }
  | {
      type: 'assistant_message_failed'
      messageId: string
      runId?: string
      error: string
    }

export type AssistantMessageLifecycleInput = {
  event: Pick<
    RuntimeEvent,
    'type' | 'content' | 'reasoningContent' | 'toolCall' | 'toolResult' | 'usage' | 'error'
  >
  messageId: string
  runId?: string
  hasStarted: boolean
  currentContent?: string
}

export function isAssistantMessageStartingRuntimeEvent(
  event: AssistantMessageLifecycleInput['event']
): boolean {
  return (
    event.type === 'text' ||
    event.type === 'reasoning' ||
    event.type === 'tool_call' ||
    event.type === 'tool_result'
  )
}

function mapUsage(usage: RuntimeEvent['usage']): AssistantMessageUsage | undefined {
  if (!usage) return undefined
  return {
    promptTokens: usage.input,
    completionTokens: usage.output,
    totalTokens: usage.input + usage.output,
    reasoningTokens: usage.reasoning,
  }
}

export function mapRuntimeEventToAssistantMessageLifecycleEvent({
  event,
  messageId,
  runId,
  hasStarted,
  currentContent = '',
}: AssistantMessageLifecycleInput): AssistantMessageLifecycleEvent | null {
  if (!hasStarted && isAssistantMessageStartingRuntimeEvent(event)) {
    return { type: 'assistant_message_started', messageId, runId }
  }

  switch (event.type) {
    case 'text':
      return event.content
        ? {
            type: 'assistant_message_delta',
            messageId,
            runId,
            delta: { kind: 'text', content: event.content },
          }
        : null
    case 'reasoning':
      return event.reasoningContent
        ? {
            type: 'assistant_message_delta',
            messageId,
            runId,
            delta: { kind: 'reasoning', content: event.reasoningContent },
          }
        : null
    case 'tool_call':
      return event.toolCall
        ? {
            type: 'assistant_message_delta',
            messageId,
            runId,
            delta: {
              kind: 'tool_call_ref',
              toolCallId: event.toolCall.id,
              toolName: event.toolCall.function.name,
            },
          }
        : null
    case 'tool_result':
      return event.toolResult
        ? {
            type: 'assistant_message_delta',
            messageId,
            runId,
            delta: {
              kind: 'tool_result_ref',
              toolCallId: event.toolResult.toolCallId,
              toolName: event.toolResult.toolName,
              status: event.toolResult.error ? 'error' : 'completed',
            },
          }
        : null
    case 'complete':
      return {
        type: 'assistant_message_completed',
        messageId,
        runId,
        content: currentContent,
        usage: mapUsage(event.usage),
      }
    case 'error':
      return {
        type: 'assistant_message_failed',
        messageId,
        runId,
        error: event.error || event.content || 'Assistant message failed',
      }
    default:
      return null
  }
}
