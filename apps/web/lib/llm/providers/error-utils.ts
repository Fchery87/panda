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
