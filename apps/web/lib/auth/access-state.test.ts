import { describe, expect, test } from 'bun:test'

import {
  getLoginPageAccessState,
  getMaintenancePageAccessState,
  getMaintenanceRedirectReason,
  getMaintenanceReasonFromSearchParams,
} from './access-state'

describe('getLoginPageAccessState', () => {
  test('allows sign-in when registration is enabled and maintenance is off', () => {
    expect(
      getLoginPageAccessState({
        registrationEnabled: true,
        systemMaintenance: false,
      })
    ).toEqual({
      kind: 'available',
      message: 'Sign in to start coding with AI',
      signInDisabled: false,
    })
  })

  test('shows maintenance copy when maintenance mode is active', () => {
    expect(
      getLoginPageAccessState({
        registrationEnabled: true,
        systemMaintenance: true,
      })
    ).toEqual({
      kind: 'maintenance',
      message: 'Maintenance mode is active. Only admins can sign in right now.',
      signInDisabled: true,
    })
  })

  test('shows registration closed copy when sign-in is disabled', () => {
    expect(
      getLoginPageAccessState({
        registrationEnabled: false,
        systemMaintenance: false,
      })
    ).toEqual({
      kind: 'registration-closed',
      message: 'Sign-in is temporarily disabled by an administrator.',
      signInDisabled: true,
    })
  })
})

describe('getMaintenancePageAccessState', () => {
  test('renders maintenance copy by default', () => {
    expect(getMaintenancePageAccessState('maintenance')).toEqual({
      kind: 'maintenance',
      title: 'Access Limited',
      message:
        'The platform is temporarily restricted by an administrator. Sign-in may be disabled while maintenance or onboarding controls are active.',
    })
  })

  test('renders registration closed copy for onboarding shutdowns', () => {
    expect(getMaintenancePageAccessState('registration-closed')).toEqual({
      kind: 'registration-closed',
      title: 'Sign-In Closed',
      message:
        'Registration is temporarily disabled by an administrator. Existing admins can still access the platform.',
    })
  })
})

describe('getMaintenanceReasonFromSearchParams', () => {
  test('defaults unknown reasons to maintenance', () => {
    expect(getMaintenanceReasonFromSearchParams(new URLSearchParams('reason=unknown'))).toBe(
      'maintenance'
    )
  })

  test('preserves registration closed when explicitly requested', () => {
    expect(
      getMaintenanceReasonFromSearchParams(new URLSearchParams('reason=registration-closed'))
    ).toBe('registration-closed')
  })
})

describe('getMaintenanceRedirectReason', () => {
  test('maps maintenance mode to maintenance redirect reason', () => {
    expect(getMaintenanceRedirectReason(true)).toBe('maintenance')
  })

  test('maps registration closure to registration closed redirect reason', () => {
    expect(getMaintenanceRedirectReason(false)).toBe('registration-closed')
  })
})
