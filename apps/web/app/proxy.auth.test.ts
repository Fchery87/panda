import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

import { getMaintenanceRedirectReason } from '@/lib/auth/access-state'
import { shouldRedirectToLogin } from '@/lib/auth/routeGuards'

describe('auth proxy guard', () => {
  test('redirects unauthenticated users on protected routes', () => {
    expect(shouldRedirectToLogin('/projects', false)).toBe(true)
    expect(shouldRedirectToLogin('/projects/123', false)).toBe(true)
    expect(shouldRedirectToLogin('/settings', false)).toBe(true)
  })

  test('does not redirect authenticated users on protected routes', () => {
    expect(shouldRedirectToLogin('/projects', true)).toBe(false)
    expect(shouldRedirectToLogin('/settings', true)).toBe(false)
  })

  test('does not redirect public routes', () => {
    expect(shouldRedirectToLogin('/login', false)).toBe(false)
    expect(shouldRedirectToLogin('/', false)).toBe(false)
    expect(shouldRedirectToLogin('/api/auth', false)).toBe(false)
  })

  test('maps redirect reasons from maintenance state', () => {
    expect(getMaintenanceRedirectReason(true)).toBe('maintenance')
    expect(getMaintenanceRedirectReason(false)).toBe('registration-closed')
  })

  test('keeps local E2E bypass secret-gated and disabled in production', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, '..', 'proxy.ts'), 'utf8')

    expect(source).toContain("process.env.NODE_ENV === 'production'")
    expect(source).toContain('return false')
    expect(source).toContain('process.env.E2E_AUTH_BYPASS_SECRET')
    expect(source).toContain("request.nextUrl.searchParams.get('e2eBypassSecret') === secret")
    expect(source).not.toContain('process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS')
    expect(source).not.toContain('process.env.E2E_AUTH_BYPASS ===')
  })
})
