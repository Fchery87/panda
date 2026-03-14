/**
 * LLM Error Types
 *
 * Typed error classes for different LLM failure modes.
 * Enables proper error classification and retry strategies.
 */

/**
 * Base error class for LLM-related errors
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'LLMError'
    Object.setPrototypeOf(this, LLMError.prototype)
  }
}

/**
 * Rate limit error with retry timing information
 */
export class RateLimitError extends LLMError {
  public readonly retryAfterMs: number

  constructor(message: string, options?: { retryAfterMs?: number; retryAfterSeconds?: number }) {
    const retryAfterMs = options?.retryAfterMs ?? (options?.retryAfterSeconds ?? 60) * 1000
    super(message, 'rate_limit', true)
    this.name = 'RateLimitError'
    this.retryAfterMs = retryAfterMs
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }

  /**
   * Parse rate limit error from HTTP response headers
   */
  static fromHeaders(headers: Headers): RateLimitError {
    // Try various header formats
    const retryAfter = headers.get('retry-after')
    const retryAfterMs = headers.get('retry-after-ms')
    const xRetryAfter = headers.get('x-retry-after')

    let delayMs = 60000 // Default: 60 seconds

    if (retryAfterMs) {
      delayMs = parseInt(retryAfterMs, 10)
    } else if (retryAfter) {
      // Retry-After can be seconds or HTTP date
      const seconds = parseInt(retryAfter, 10)
      if (!isNaN(seconds)) {
        delayMs = seconds * 1000
      }
    } else if (xRetryAfter) {
      const seconds = parseInt(xRetryAfter, 10)
      if (!isNaN(seconds)) {
        delayMs = seconds * 1000
      }
    }

    return new RateLimitError('Rate limit exceeded', { retryAfterMs: delayMs })
  }

  /**
   * Extract from common rate limit error message patterns
   */
  static fromMessage(message: string): RateLimitError {
    // Look for patterns like "try again in X seconds/minutes"
    const secondsMatch = message.match(/try again in (\d+(?:\.\d+)?) seconds?/i)
    const minutesMatch = message.match(/try again in (\d+(?:\.\d+)?) minutes?/i)

    let retryAfterMs = 60000

    if (secondsMatch) {
      retryAfterMs = parseFloat(secondsMatch[1]) * 1000
    } else if (minutesMatch) {
      retryAfterMs = parseFloat(minutesMatch[1]) * 60 * 1000
    }

    return new RateLimitError(message, { retryAfterMs })
  }
}

/**
 * Authentication error - API key invalid or expired
 * NOT retryable - requires user intervention
 */
export class AuthError extends LLMError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'auth_error', false)
    this.name = 'AuthError'
    Object.setPrototypeOf(this, AuthError.prototype)
  }
}

/**
 * Output length exceeded error
 * Can be retryable with reduced maxTokens
 */
export class OutputLengthError extends LLMError {
  constructor(message: string = 'Output length exceeded') {
    super(message, 'output_length', true)
    this.name = 'OutputLengthError'
    Object.setPrototypeOf(this, OutputLengthError.prototype)
  }
}

/**
 * Content filter/rejection error
 * NOT retryable - content violates policy
 */
export class ContentFilterError extends LLMError {
  public readonly filterType?: string

  constructor(message: string = 'Content filtered', filterType?: string) {
    super(message, 'content_filter', false)
    this.name = 'ContentFilterError'
    this.filterType = filterType
    Object.setPrototypeOf(this, ContentFilterError.prototype)
  }
}

/**
 * Context window overflow error
 * Can be retryable with compaction
 */
export class ContextOverflowError extends LLMError {
  public readonly currentTokens?: number
  public readonly maxTokens?: number

  constructor(
    message: string = 'Context window exceeded',
    options?: { currentTokens?: number; maxTokens?: number }
  ) {
    super(message, 'context_overflow', true)
    this.name = 'ContextOverflowError'
    this.currentTokens = options?.currentTokens
    this.maxTokens = options?.maxTokens
    Object.setPrototypeOf(this, ContextOverflowError.prototype)
  }
}

/**
 * Stream idle timeout error
 * Retryable with backoff
 */
export class StreamIdleTimeoutError extends LLMError {
  public readonly idleTimeMs: number

  constructor(idleTimeMs: number = 120000) {
    super(`Stream idle timeout after ${idleTimeMs}ms`, 'stream_idle_timeout', true)
    this.name = 'StreamIdleTimeoutError'
    this.idleTimeMs = idleTimeMs
    Object.setPrototypeOf(this, StreamIdleTimeoutError.prototype)
  }
}

/**
 * Structured output validation error
 * Can be retryable with different schema/prompt
 */
export class StructuredOutputError extends LLMError {
  public readonly validationErrors?: string[]

  constructor(
    message: string = 'Structured output validation failed',
    validationErrors?: string[]
  ) {
    super(message, 'structured_output', true)
    this.name = 'StructuredOutputError'
    this.validationErrors = validationErrors
    Object.setPrototypeOf(this, StructuredOutputError.prototype)
  }
}

/**
 * Network/connection error
 * Retryable with exponential backoff
 */
export class NetworkError extends LLMError {
  public readonly originalError?: Error

  constructor(message: string = 'Network error', originalError?: Error) {
    super(message, 'network_error', true)
    this.name = 'NetworkError'
    this.originalError = originalError
    Object.setPrototypeOf(this, NetworkError.prototype)
  }
}

/**
 * API error - generic provider error
 * May or may not be retryable
 */
export class APIError extends LLMError {
  public readonly statusCode?: number
  public readonly responseBody?: unknown

  constructor(
    message: string,
    options?: {
      statusCode?: number
      responseBody?: unknown
      retryable?: boolean
    }
  ) {
    super(message, 'api_error', options?.retryable ?? false)
    this.name = 'APIError'
    this.statusCode = options?.statusCode
    this.responseBody = options?.responseBody
    Object.setPrototypeOf(this, APIError.prototype)
  }
}

/**
 * Error detection utilities
 */

/**
 * Check if an error is a specific LLM error type
 */
export function isLLMError(error: unknown): error is LLMError {
  return error instanceof LLMError
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof LLMError) {
    return error.retryable
  }

  // Legacy string-based detection as fallback
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Non-retryable errors
    if (
      message.includes('invalid api key') ||
      message.includes('authentication') ||
      message.includes('unauthorized') ||
      message.includes('content policy') ||
      message.includes('content filter') ||
      message.includes('safety') ||
      message.includes('moderation')
    ) {
      return false
    }

    // Retryable errors
    if (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('overload') ||
      message.includes('capacity') ||
      message.includes('retry')
    ) {
      return true
    }
  }

  return false
}

/**
 * Extract retry delay from error
 */
export function getRetryDelayMs(error: unknown): number | undefined {
  if (error instanceof RateLimitError) {
    return error.retryAfterMs
  }

  if (error instanceof Error) {
    // Try to extract from message
    const message = error.message.toLowerCase()
    const secondsMatch = message.match(/retry after (\d+) seconds/)
    if (secondsMatch) {
      return parseInt(secondsMatch[1], 10) * 1000
    }
  }

  return undefined
}

/**
 * Classify an unknown error into a typed LLM error
 */
export function classifyError(error: unknown, response?: Response): LLMError {
  // Already typed
  if (error instanceof LLMError) {
    return error
  }

  const errorMessage = error instanceof Error ? error.message : String(error)
  const lowerMessage = errorMessage.toLowerCase()

  // Check response status first
  if (response) {
    if (response.status === 429) {
      return RateLimitError.fromHeaders(response.headers)
    }
    if (response.status === 401 || response.status === 403) {
      return new AuthError(errorMessage)
    }
    if (response.status >= 500) {
      return new APIError(errorMessage, { statusCode: response.status, retryable: true })
    }
  }

  // Pattern matching for common errors
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return RateLimitError.fromMessage(errorMessage)
  }

  if (
    lowerMessage.includes('invalid api key') ||
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('unauthorized')
  ) {
    return new AuthError(errorMessage)
  }

  if (
    lowerMessage.includes('context length') ||
    lowerMessage.includes('maximum context') ||
    lowerMessage.includes('token limit exceeded') ||
    lowerMessage.includes('context window')
  ) {
    return new ContextOverflowError(errorMessage)
  }

  if (
    lowerMessage.includes('content policy') ||
    lowerMessage.includes('content filter') ||
    lowerMessage.includes('safety') ||
    lowerMessage.includes('moderation')
  ) {
    return new ContentFilterError(errorMessage)
  }

  if (lowerMessage.includes('output length') || lowerMessage.includes('max tokens')) {
    return new OutputLengthError(errorMessage)
  }

  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('econnreset') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('etimedout')
  ) {
    return new NetworkError(errorMessage, error instanceof Error ? error : undefined)
  }

  // Default to API error
  return new APIError(errorMessage, { retryable: true })
}
