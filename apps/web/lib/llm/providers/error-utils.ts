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
        } catch {
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
