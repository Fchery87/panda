export function shouldRedirectToLogin(pathname: string, authenticated: boolean): boolean {
  return (
    !authenticated &&
    (pathname.startsWith('/projects') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/admin'))
  )
}

export function shouldRedirectToProjects(pathname: string, authenticated: boolean): boolean {
  return authenticated && pathname === '/login'
}

export function shouldAllowRegistration(registrationEnabled: boolean): boolean {
  return registrationEnabled
}

export function shouldRedirectToMaintenance(
  pathname: string,
  authenticated: boolean,
  systemMaintenance: boolean
): boolean {
  return (
    !authenticated &&
    systemMaintenance &&
    (pathname.startsWith('/projects') || pathname.startsWith('/settings'))
  )
}

export function shouldRedirectToLoginDisabled(
  pathname: string,
  authenticated: boolean,
  registrationEnabled: boolean,
  systemMaintenance: boolean
): boolean {
  return !authenticated && pathname === '/login' && (!registrationEnabled || systemMaintenance)
}

export function shouldBlockForMaintenance(
  pathname: string,
  authenticated: boolean,
  isAdmin: boolean,
  systemMaintenance: boolean
): boolean {
  if (!systemMaintenance || !authenticated || isAdmin) {
    return false
  }

  return pathname.startsWith('/projects') || pathname.startsWith('/settings')
}
