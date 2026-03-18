import { describe, expect, it } from 'bun:test'
import {
  getApiKeyFromAuthorizationHeader,
  sanitizeInternalErrorMessage,
  sanitizeUpstreamLlmError,
} from './http-security'

describe('LLM HTTP security helpers', () => {
  it('extracts bearer tokens from authorization headers', () => {
    expect(getApiKeyFromAuthorizationHeader('Bearer test-key')).toBe('test-key')
    expect(getApiKeyFromAuthorizationHeader('Basic abc123')).toBe('')
    expect(getApiKeyFromAuthorizationHeader(null)).toBe('')
  })

  it('returns generic upstream errors to clients', () => {
    expect(
      sanitizeUpstreamLlmError({
        status: 401,
        bodyPreview: 'invalid_api_key: sk-live-secret',
      })
    ).toBe('LLM service unavailable')
  })

  it('redacts sensitive details from unexpected internal errors', () => {
    expect(sanitizeInternalErrorMessage(new Error('OPENAI_API_KEY missing at /tmp/secret'))).toBe(
      'Request failed'
    )
    expect(sanitizeInternalErrorMessage('plain failure')).toBe('Request failed')
  })
})
