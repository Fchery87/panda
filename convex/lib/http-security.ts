export function getApiKeyFromAuthorizationHeader(header: string | null): string {
  if (!header?.startsWith('Bearer ')) {
    return ''
  }

  return header.slice(7).trim()
}

export function sanitizeUpstreamLlmError(_details: {
  status?: number
  bodyPreview?: string
}): string {
  return 'LLM service unavailable'
}

export function sanitizeInternalErrorMessage(_error: unknown): string {
  return 'Request failed'
}
