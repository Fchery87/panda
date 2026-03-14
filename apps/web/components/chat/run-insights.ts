interface SnapshotLike {
  _id?: string
  type: string
  content?: string
  createdAt?: number
  snapshot?: {
    hash?: string
    step?: number
    files?: string[]
  }
}

interface ToolCallLike {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'error'
  result?: {
    output: string
    error?: string
    durationMs: number
  }
}

export interface SnapshotEntry {
  id: string
  hash: string
  step: number
  files: string[]
  createdAt: number
  label: string
}

export interface SubagentEntry {
  id: string
  agent: string
  prompt: string
  status: ToolCallLike['status']
  output?: string
  durationMs?: number
  error?: string
}

export function deriveSnapshotEntries(events: SnapshotLike[]): SnapshotEntry[] {
  return events
    .filter((event) => event.type === 'snapshot' && Boolean(event.snapshot?.hash))
    .map((event) => ({
      id: event._id ?? `${event.snapshot?.hash}-${event.createdAt ?? 0}`,
      hash: event.snapshot?.hash ?? '',
      step: event.snapshot?.step ?? 0,
      files: event.snapshot?.files ?? [],
      createdAt: event.createdAt ?? 0,
      label: event.content ?? `Snapshot ${event.snapshot?.hash ?? ''}`,
    }))
}

export function deriveSubagentEntries(toolCalls: ToolCallLike[]): SubagentEntry[] {
  return toolCalls
    .filter((call) => call.name === 'task')
    .map((call) => ({
      id: call.id,
      agent: String(call.args.subagent_type ?? 'unknown'),
      prompt: String(call.args.prompt ?? ''),
      status: call.status,
      output: call.result?.output,
      durationMs: call.result?.durationMs,
      error: call.result?.error,
    }))
}
