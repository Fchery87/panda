import { describe, expect, it } from 'bun:test'
import { buildSecurityHeaders } from './next.config'

describe('buildSecurityHeaders', () => {
  it('hardens production CSP and enables HSTS', () => {
    const headers = buildSecurityHeaders(false)
    const csp = headers.find((header) => header.key === 'Content-Security-Policy')?.value

    expect(csp).toBeTruthy()
    expect(csp).not.toContain('unsafe-inline')
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).toContain("default-src 'self'")
    expect(headers).toContainEqual({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains; preload',
    })
  })

  it('keeps development eval support isolated to development builds', () => {
    const headers = buildSecurityHeaders(true)
    const csp = headers.find((header) => header.key === 'Content-Security-Policy')?.value

    expect(csp).toContain('unsafe-eval')
    expect(csp).not.toContain('unsafe-inline')
  })
})
