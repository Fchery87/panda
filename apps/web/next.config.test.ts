import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import nextConfig, {
  buildSecurityHeaders,
  codeMirrorResolveAlias,
  codeMirrorTurbopackResolveAlias,
} from './next.config'

type CodeMirrorPackageName = keyof typeof codeMirrorResolveAlias

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

describe('CodeMirror bundler aliases', () => {
  const expectedPackages: CodeMirrorPackageName[] = [
    '@codemirror/autocomplete',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/merge',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/theme-one-dark',
    '@codemirror/view',
  ]

  it('pins every CodeMirror package that crosses editor extension boundaries', () => {
    expect(Object.keys(codeMirrorResolveAlias).sort()).toEqual(expectedPackages.sort())
  })

  it('points aliases at installed app package directories', () => {
    for (const packageName of expectedPackages) {
      expect(codeMirrorResolveAlias[packageName]).toContain('/node_modules/.bun/')
      expect(existsSync(codeMirrorResolveAlias[packageName])).toBe(true)
    }
  })

  it('uses root-relative aliases for Turbopack', () => {
    for (const packageName of expectedPackages) {
      const alias = codeMirrorTurbopackResolveAlias[packageName]
      expect(alias).toStartWith('./node_modules/.bun/')
      expect(alias).not.toStartWith('/')
      expect(existsSync(alias.replace('./', '../../'))).toBe(true)
    }
  })

  it('uses the same aliases for Turbopack and webpack resolution', () => {
    expect(nextConfig.turbopack?.resolveAlias).toEqual(codeMirrorTurbopackResolveAlias)

    const webpack = nextConfig.webpack
    expect(typeof webpack).toBe('function')

    const webpackContext = {
      webpack: {},
      isServer: false,
    } as Parameters<NonNullable<typeof webpack>>[1]
    const config = webpack?.({ resolve: { alias: {} } }, webpackContext) as {
      resolve?: { alias?: Record<string, string> }
    }

    expect(config.resolve?.alias).toMatchObject(codeMirrorResolveAlias)
  })
})
