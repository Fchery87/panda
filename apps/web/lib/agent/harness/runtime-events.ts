import type { RuntimeEvent } from './runtime'

export function createToolResultEvent(args: {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  output: string
  error?: string
  startedAt?: number
  finishedAt?: number
}): RuntimeEvent {
  const finishedAt = args.finishedAt ?? Date.now()
  const startedAt = args.startedAt ?? finishedAt

  return {
    type: 'tool_result',
    toolResult: {
      toolCallId: args.toolCallId,
      toolName: args.toolName,
      args: args.args,
      output: args.output,
      ...(args.error ? { error: args.error } : {}),
      durationMs: Math.max(0, finishedAt - startedAt),
    },
  }
}
