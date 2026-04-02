export type AccessReason = 'maintenance' | 'registration-closed'

export type LoginPageAccessState =
  | {
      kind: 'available'
      message: string
      signInDisabled: false
    }
  | {
      kind: 'maintenance'
      message: string
      signInDisabled: true
    }
  | {
      kind: 'registration-closed'
      message: string
      signInDisabled: true
    }

export type MaintenancePageAccessState =
  | {
      kind: 'maintenance'
      title: string
      message: string
    }
  | {
      kind: 'registration-closed'
      title: string
      message: string
    }

export function getLoginPageAccessState(input: {
  registrationEnabled: boolean
  systemMaintenance: boolean
}): LoginPageAccessState {
  if (input.systemMaintenance) {
    return {
      kind: 'maintenance',
      message: 'Maintenance mode is active. Only admins can sign in right now.',
      signInDisabled: true,
    }
  }

  if (!input.registrationEnabled) {
    return {
      kind: 'registration-closed',
      message: 'Sign-in is temporarily disabled by an administrator.',
      signInDisabled: true,
    }
  }

  return {
    kind: 'available',
    message: 'Sign in to start coding with AI',
    signInDisabled: false,
  }
}

export function getMaintenancePageAccessState(reason: AccessReason): MaintenancePageAccessState {
  if (reason === 'registration-closed') {
    return {
      kind: 'registration-closed',
      title: 'Sign-In Closed',
      message:
        'Registration is temporarily disabled by an administrator. Existing admins can still access the platform.',
    }
  }

  return {
    kind: 'maintenance',
    title: 'Access Limited',
    message:
      'The platform is temporarily restricted by an administrator. Sign-in may be disabled while maintenance or onboarding controls are active.',
  }
}

export function getMaintenanceReasonFromSearchParams(
  searchParams: URLSearchParams | { reason?: string | string[] | undefined } | null | undefined
): AccessReason {
  const reason = (() => {
    if (!searchParams) return null
    if (searchParams instanceof URLSearchParams) return searchParams.get('reason')
    const value = searchParams.reason
    return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
  })()

  return reason === 'registration-closed' ? 'registration-closed' : 'maintenance'
}

export function getMaintenanceRedirectReason(systemMaintenance: boolean): AccessReason {
  return systemMaintenance ? 'maintenance' : 'registration-closed'
}
