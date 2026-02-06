import { describe, expect, test } from 'bun:test'

import { shouldRedirectToLogin } from '@/lib/auth/routeGuards'

describe('auth middleware guard', () => {
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
})
