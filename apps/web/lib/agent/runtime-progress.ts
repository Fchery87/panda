import { safeJSONParse } from './harness/tool-repair'
import type { AgentEvent } from './runtime'

type ToolCallProgressEvent = {
  toolCall?: {
    id?: string
    function: {
      name: string
      arguments: string
    }
  }
}

type ToolResultProgressEvent = {
  toolResult?: {
    toolCallId?: string
    toolName?: string
    args?: Record<string, unknown>
    error?: string
    durationMs?: number
  }
}

export function mapToolCallToProgressStep(event: ToolCallProgressEvent): AgentEvent {
  return {
    type: 'progress_step',
    content: `Running tool: ${event.toolCall?.function.name ?? 'unknown'}`,
    progressStatus: 'running',
    progressCategory: 'tool',
    progressToolName: event.toolCall?.function.name,
    progressToolCallId: event.toolCall?.id,
    progressArgs: event.toolCall
      ? (safeJSONParse<Record<string, unknown>>(event.toolCall.function.arguments, {}) ?? {})
      : undefined,
    progressHasArtifactTarget:
      event.toolCall?.function.name === 'write_files' ||
      event.toolCall?.function.name === 'run_command' ||
      event.toolCall?.function.name === 'apply_patch',
  }
}

export function mapToolResultToProgressStep(event: ToolResultProgressEvent): AgentEvent {
  const toolResult = event.toolResult

  return {
    type: 'progress_step',
    content: `Tool ${toolResult?.error ? 'failed' : 'completed'}: ${toolResult?.toolName ?? 'unknown'}`,
    progressStatus: toolResult?.error ? 'error' : 'completed',
    progressCategory: 'tool',
    progressToolName: toolResult?.toolName,
    progressToolCallId: toolResult?.toolCallId,
    progressArgs: toolResult?.args,
    progressDurationMs: toolResult?.durationMs,
    progressError: toolResult?.error,
    progressHasArtifactTarget:
      toolResult?.toolName === 'write_files' ||
      toolResult?.toolName === 'run_command' ||
      toolResult?.toolName === 'apply_patch',
  }
}
