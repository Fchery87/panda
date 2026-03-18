import { describe, expect, it } from 'bun:test'
import { buildSecurityHeaders } from './next.config'

describe('buildSecurityHeaders', () => {
  it('uses the Next.js-compatible static CSP shape in production', () => {
    const headers = buildSecurityHeaders({
      isDev: false,
      isHttpsDeployment: true,
    })
    const csp = headers.find((header) => header.key === 'Content-Security-Policy')?.value

    expect(csp).toBeTruthy()
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).toContain("default-src 'self'")
    expect(headers).toContainEqual({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains; preload',
    })
  })

  it('keeps development eval support and omits HSTS for local http dev', () => {
    const headers = buildSecurityHeaders({
      isDev: true,
      isHttpsDeployment: false,
    })
    const csp = headers.find((header) => header.key === 'Content-Security-Policy')?.value

    expect(csp).toContain('unsafe-inline')
    expect(csp).toContain('unsafe-eval')
    expect(headers.some((header) => header.key === 'Strict-Transport-Security')).toBe(false)
  })
})
