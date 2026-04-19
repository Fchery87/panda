export function isToolRetryAllowed(toolName: string): boolean {
  return !['write_files', 'run_command', 'task', 'update_memory_bank'].includes(toolName)
}

export function isToolIdempotencyCacheAllowed(toolName: string): boolean {
  return !['write_files', 'run_command', 'task', 'update_memory_bank'].includes(toolName)
}

export function isRetryableToolError(errorMessage: string): boolean {
  const message = errorMessage.toLowerCase()
  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('econnreset') ||
    message.includes('eai_again') ||
    message.includes('temporar') ||
    message.includes('429') ||
    message.includes('rate limit')
  )
}

export function createToolCallDedupKey(toolName: string, args: Record<string, unknown>): string {
  return `${toolName}:${normalizeToolArgs(args)}`
}

function normalizeToolArgs(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => normalizeToolArgs(item)).join(',')}]`
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  )

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${normalizeToolArgs(entryValue)}`)
    .join(',')}}`
}

export async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}
