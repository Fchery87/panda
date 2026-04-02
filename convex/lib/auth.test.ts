import { describe, expect, it } from 'bun:test'
import { isE2EAuthBypassAllowedForEnv } from './auth'

describe('isE2EAuthBypassAllowedForEnv', () => {
  it('allows bypass for explicit non-production E2E environments', () => {
    expect(
      isE2EAuthBypassAllowedForEnv({
        E2E_AUTH_BYPASS: 'true',
        NODE_ENV: 'development',
      })
    ).toBe(true)
  })

  it('rejects bypass when not explicitly enabled', () => {
    expect(
      isE2EAuthBypassAllowedForEnv({
        E2E_AUTH_BYPASS: 'false',
        CONVEX_SITE_URL: 'http://127.0.0.1:3210',
      })
    ).toBe(false)
  })

  it('rejects bypass in production even if enabled', () => {
    expect(
      isE2EAuthBypassAllowedForEnv({
        E2E_AUTH_BYPASS: 'true',
        NODE_ENV: 'production',
      })
    ).toBe(false)
  })
})
