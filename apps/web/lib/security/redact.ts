/**
 * Redaction Utility - Prevents leaking sensitive info in logs and responses
 */

const PATH_REGEX = /(\/|[a-zA-Z]:\\)(?:[\w.-]+[/\\]?)+/g
const STACK_FRAME_REGEX = /^\s*at\s+.*$/m

function getSensitiveEnvValues(): string[] {
  const sensitiveNamePattern =
    /(secret|token|password|passwd|api[_-]?key|auth|credential|private[_-]?key)/i

  return Object.entries(process.env)
    .filter(([name, value]) => sensitiveNamePattern.test(name) && typeof value === 'string')
    .map(([, value]) => value as string)
    .filter((value) => value.length > 5)
    .sort((a, b) => b.length - a.length)
}

/**
 * Strips sensitive patterns from error strings
 */
export function redactError(message: string | undefined): string {
  if (!message) return ''

  let redacted = message

  // 1. Redact absolute file paths (common in stack traces and build errors)
  // We keep the last part of the path if it looks like a filename for debugging
  redacted = redacted.replace(PATH_REGEX, (match) => {
    const parts = match.split(/[/\\]/)
    const lastPart = parts[parts.length - 1]
    if (lastPart && (lastPart.includes('.') || lastPart.length > 3)) {
      return `.../${lastPart}`
    }
    return '[REDACTED_PATH]'
  })

  // 2. Remove stack trace frames beyond the first line
  const lines = redacted.split('\n')
  if (lines.length > 1) {
    const firstLine = lines[0]
    const otherLines = lines.slice(1)
    const filteredLines = otherLines.filter((line) => !STACK_FRAME_REGEX.test(line))
    redacted = [firstLine, ...filteredLines].join('\n').trim()
  }

  // 3. Redact known environment variables if they appear (placeholder for more complex logic)
  for (const secret of getSensitiveEnvValues()) {
    redacted = redacted.split(secret).join('[REDACTED]')
  }

  return redacted
}

/**
 * Redacts an entire response object body
 */
export function redactResponse(body: Record<string, any>): Record<string, any> {
  const result = { ...body }

  if (typeof result.stderr === 'string') {
    result.stderr = redactError(result.stderr)
  }

  if (typeof result.stdout === 'string') {
    result.stdout = redactError(result.stdout)
  }

  if (typeof result.error === 'string') {
    result.error = redactError(result.error)
  }

  return result
}
