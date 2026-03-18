import { describe, expect, it } from 'bun:test'
import { isE2EAuthBypassAllowedForEnv } from './auth'

describe('isE2EAuthBypassAllowedForEnv', () => {
  it('allows bypass only for explicit local e2e environments', () => {
    expect(
      isE2EAuthBypassAllowedForEnv({
        E2E_AUTH_BYPASS: 'true',
        CONVEX_SITE_URL: 'http://127.0.0.1:3210',
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

  it('rejects bypass for non-local deployments even if enabled', () => {
    expect(
      isE2EAuthBypassAllowedForEnv({
        E2E_AUTH_BYPASS: 'true',
        CONVEX_SITE_URL: 'https://prod.convex.site',
        NEXT_PUBLIC_APP_URL: 'https://panda.ai',
      })
    ).toBe(false)
  })
})
