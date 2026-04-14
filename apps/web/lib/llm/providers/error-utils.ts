/**
 * Check if an error indicates context overflow
 * Parses provider-specific error messages for context length exceeded
 */
export function isContextOverflowError(error: unknown): boolean {
  if (!error) return false

  const message = error instanceof Error ? error.message : String(error)
  const messageLower = message.toLowerCase()

  // Provider-specific context overflow patterns
  const contextOverflowPatterns = [
    'context_length_exceeded',
    'maximum context length',
    'prompt is too long',
    'tokens exceed',
    'context window exceeded',
    'input is too long',
    'message is too long',
    'token limit exceeded',
    'exceeds maximum tokens',
    'context size exceeded',
    'prompt tokens exceed',
    'input tokens exceed',
  ]

  return contextOverflowPatterns.some((pattern) => messageLower.includes(pattern))
}

/**
 * Common aliases for hallucinated tool names.
 * Models trained on other systems (Cursor, Copilot, etc.) often call tools
 * by different names. This table maps them to Panda's canonical names.
 */
const TOOL_ALIASES: Record<string, string> = {
  write_to_file: 'write_files',
  write_file: 'write_files',
  create_file: 'write_files',
  overwrite_file: 'write_files',
  read_file: 'read_files',
  view_file: 'read_files',
  open_file: 'read_files',
  list_files: 'list_directory',
  list_dir: 'list_directory',
  ls: 'list_directory',
  run_terminal_cmd: 'run_command',
  execute_command: 'run_command',
  bash: 'run_command',
  shell: 'run_command',
  terminal: 'run_command',
  search: 'search_code',
  grep: 'search_code',
  find_in_file: 'search_code',
  edit_file: 'apply_patch',
  str_replace: 'apply_patch',
  replace_in_file: 'apply_patch',
  str_replace_editor: 'apply_patch',
}

/**
 * Attempt to map a hallucinated tool name to an available tool.
 * Returns the best available match or null if nothing is close enough.
 */
export function repairHallucinatedToolName(name: string, available: string[]): string | null {
  const lower = name.toLowerCase().replace(/[^a-z0-9_]/g, '_')

  // 1. Direct alias table lookup
  const alias = TOOL_ALIASES[lower] ?? TOOL_ALIASES[name]
  if (alias && available.includes(alias)) return alias

  // 2. Exact case-insensitive match
  const exact = available.find((t) => t.toLowerCase() === lower)
  if (exact) return exact

  // 3. Levenshtein distance ≤ 3
  let best: string | null = null
  let bestDist = 4
  for (const t of available) {
    const d = levenshteinDistance(lower, t.toLowerCase())
    if (d < bestDist) {
      bestDist = d
      best = t
    }
  }
  return best
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export function formatProviderError(error: unknown): string {
  const details: string[] = []
  const seen = new Set<unknown>()

  const visit = (value: unknown, depth = 0) => {
    if (!value || depth > 3 || seen.has(value)) return
    seen.add(value)

    if (value instanceof Error && value.message) {
      details.push(value.message)
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>

      if (typeof record.statusCode === 'number') {
        details.push(`status ${record.statusCode}`)
      }

      if (typeof record.responseBody === 'string' && record.responseBody.trim()) {
        const body = record.responseBody.trim()
        try {
          const parsed = JSON.parse(body) as Record<string, unknown>
          const nestedError = parsed.error
          if (typeof nestedError === 'string') {
            details.push(nestedError)
          } else if (nestedError && typeof nestedError === 'object') {
            const nestedMessage = (nestedError as Record<string, unknown>).message
            if (typeof nestedMessage === 'string') {
              details.push(nestedMessage)
            }
          }
        } catch (error) {
          void error
          details.push(body.slice(0, 400))
        }
      }

      visit(record.cause, depth + 1)
    } else if (typeof value === 'string') {
      details.push(value)
    }
  }

  visit(error)

  const unique = Array.from(new Set(details.map((d) => d.trim()).filter(Boolean)))
  return unique.length > 0 ? unique.join(' | ') : 'Provider request failed'
}
