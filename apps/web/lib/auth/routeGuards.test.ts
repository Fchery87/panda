import { describe, expect, test } from 'bun:test'

import {
  shouldAllowRegistration,
  shouldBlockForMaintenance,
  shouldRedirectToLogin,
} from '@/lib/auth/routeGuards'

describe('route guards', () => {
  test('redirects unauthenticated users on protected routes including admin', () => {
    expect(shouldRedirectToLogin('/projects', false)).toBe(true)
    expect(shouldRedirectToLogin('/settings', false)).toBe(true)
    expect(shouldRedirectToLogin('/admin', false)).toBe(true)
    expect(shouldRedirectToLogin('/admin/users', false)).toBe(true)
  })

  test('allows registration only when enabled', () => {
    expect(shouldAllowRegistration(true)).toBe(true)
    expect(shouldAllowRegistration(false)).toBe(false)
  })

  test('blocks non-admins during maintenance on app routes', () => {
    expect(shouldBlockForMaintenance('/projects', true, false, true)).toBe(true)
    expect(shouldBlockForMaintenance('/settings', true, false, true)).toBe(true)
    expect(shouldBlockForMaintenance('/admin', true, true, true)).toBe(false)
    expect(shouldBlockForMaintenance('/login', false, false, true)).toBe(false)
    expect(shouldBlockForMaintenance('/projects', true, false, false)).toBe(false)
  })
})
