export function parseRetryAfterSeconds(message: string): number | null {
  const directMatch = message.match(/retry[-\s_]?after[:=\s]+(\d{1,5})/i)
  if (directMatch) {
    const seconds = Number(directMatch[1])
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null
  }

  const bracketMatch = message.match(/retry[-\s_]?after[^0-9]*(\d{1,5})/i)
  if (bracketMatch) {
    const seconds = Number(bracketMatch[1])
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null
  }

  return null
}

export function isRateLimitError(rawError: string | null | undefined): boolean {
  const message = (rawError || '').toLowerCase()
  return (
    message.includes('status 429') ||
    message.includes(' 429') ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  )
}

export function getUserFacingAgentError(rawError: string | null | undefined): {
  title: string
  description: string
} {
  const message = (rawError || 'Unknown error').trim()
  const isRateLimited = isRateLimitError(message)

  if (isRateLimited) {
    const retryAfterSeconds = parseRetryAfterSeconds(message)
    const retryHint = retryAfterSeconds
      ? ` Retry after about ${retryAfterSeconds} seconds.`
      : ''
    return {
      title: 'Provider rate limited (429)',
      description:
        `Your LLM provider rejected the request due to rate limits or quota.${retryHint}` +
        ' Try again shortly, switch to another model/provider, or increase provider credits/limits.',
    }
  }

  return {
    title: 'Agent error',
    description: message,
  }
}
