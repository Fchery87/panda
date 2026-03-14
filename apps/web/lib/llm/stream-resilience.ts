/**
 * Stream Resilience - Timeout detection, retry logic, and error classification
 *
 * Implements OpenCode-style stream resilience:
 * - Chunk timeout detection for stalled streams
 * - Exponential backoff retry with max retries
 * - Error classification for retryable errors
 * - Context overflow detection
 */

import {
  LLMError,
  RateLimitError,
  AuthError,
  OutputLengthError,
  ContentFilterError,
  ContextOverflowError,
  StreamIdleTimeoutError,
  StructuredOutputError,
  NetworkError,
  APIError,
  isRetryableError as isRetryableTypedError,
} from './errors'

export {
  LLMError,
  RateLimitError,
  AuthError,
  OutputLengthError,
  ContentFilterError,
  ContextOverflowError,
  StreamIdleTimeoutError,
  StructuredOutputError,
  NetworkError,
  APIError,
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 2000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
}

/**
 * Calculate delay for retry attempt using exponential backoff
 */
function calculateRetryDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt)
  return Math.min(delay, options.maxDelayMs)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wrap an AsyncGenerator with chunk timeout detection
 * Throws StreamIdleTimeoutError if no chunk received within timeout
 */
export async function* withChunkTimeout<T>(
  stream: AsyncGenerator<T>,
  timeoutMs: number
): AsyncGenerator<T> {
  const iterator = stream[Symbol.asyncIterator]()
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let timedOut = false

  const resetTimeout = (): Promise<void> => {
    return new Promise((_, reject) => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        timedOut = true
        reject(new StreamIdleTimeoutError(timeoutMs))
      }, timeoutMs)
    })
  }

  try {
    while (true) {
      // Race between next chunk and timeout
      const result = await Promise.race([iterator.next(), resetTimeout()])

      if (timedOut) break

      if ((result as IteratorResult<T>).done) {
        break
      }

      yield (result as IteratorResult<T>).value
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
    // Ensure iterator is properly cleaned up
    if (typeof iterator.return === 'function') {
      await iterator.return(undefined)
    }
  }
}

/**
 * Retry a stream factory with exponential backoff
 * Automatically retries on retryable errors up to maxRetries
 */
export async function* withRetry<T>(
  streamFactory: () => AsyncGenerator<T>,
  options: RetryOptions = {}
): AsyncGenerator<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const stream = streamFactory()
      for await (const chunk of stream) {
        yield chunk
      }
      return // Success - exit retry loop
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if error is retryable
      if (!isRetryableError(lastError)) {
        throw lastError
      }

      // Don't retry after last attempt
      if (attempt >= opts.maxRetries) {
        throw new Error(`Stream failed after ${opts.maxRetries + 1} attempts: ${lastError.message}`)
      }

      // Calculate and apply backoff delay
      const delay = calculateRetryDelay(attempt, opts)

      // Emit retry notification
      yield {
        type: 'retry',
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
        error: lastError.message,
        nextRetryMs: delay,
      } as unknown as T

      await sleep(delay)
    }
  }
}

/**
 * Combined wrapper for timeout and retry
 * Applies timeout detection to each retry attempt
 */
export async function* withTimeoutAndRetry<T>(
  streamFactory: (attempt: number) => AsyncGenerator<T>,
  timeoutMs: number,
  retryOptions: RetryOptions = {}
): AsyncGenerator<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions }
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const stream = streamFactory(attempt)
      const timeoutStream = withChunkTimeout(stream, timeoutMs)

      for await (const chunk of timeoutStream) {
        // Filter out retry notifications from inner stream
        if (isRetryNotification(chunk)) {
          continue
        }
        yield chunk
      }
      return // Success - exit retry loop
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Context overflow errors should trigger compaction and retry at higher level
      if (isContextOverflowError(lastError)) {
        throw lastError
      }

      // Check if error is retryable
      if (!isRetryableError(lastError)) {
        throw lastError
      }

      // Don't retry after last attempt
      if (attempt >= opts.maxRetries) {
        throw new Error(`Stream failed after ${opts.maxRetries + 1} attempts: ${lastError.message}`)
      }

      // Calculate and apply backoff delay
      const delay = calculateRetryDelay(attempt, opts)

      // Emit retry notification
      yield {
        type: 'retry',
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
        error: lastError.message,
        nextRetryMs: delay,
      } as unknown as T

      await sleep(delay)
    }
  }
}

/**
 * Check if a chunk is a retry notification
 */
function isRetryNotification<T>(chunk: T): boolean {
  return (
    typeof chunk === 'object' &&
    chunk !== null &&
    'type' in chunk &&
    (chunk as Record<string, unknown>).type === 'retry'
  )
}

/**
 * Check if an error is retryable
 * Uses typed error classes first, falls back to string matching
 * Detects transient errors like rate limits, 5xx errors, timeouts
 */
export function isRetryableError(error: Error): boolean {
  // Check for typed errors first using instanceof
  if (error instanceof LLMError) {
    return error.retryable
  }

  // Legacy checks for backward compatibility
  if (error instanceof StreamIdleTimeoutError) {
    return true
  }

  // Fall back to string-based detection
  return isRetryableTypedError(error)
}

/**
 * Check if error indicates context overflow
 * Parses provider-specific error messages for context length exceeded
 */
export function isContextOverflowError(error: Error): boolean {
  // Check for ContextOverflowError instance
  if (error instanceof ContextOverflowError) {
    return true
  }

  const message = error.message.toLowerCase()

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

  return contextOverflowPatterns.some((pattern) => message.includes(pattern))
}

/**
 * Retry event chunk type for UI notifications
 */
export interface RetryEventChunk {
  type: 'retry'
  attempt: number
  maxRetries: number
  error: string
  nextRetryMs: number
}
