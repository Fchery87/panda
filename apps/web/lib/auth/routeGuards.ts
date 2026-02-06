export function shouldRedirectToLogin(pathname: string, authenticated: boolean): boolean {
  return !authenticated && (pathname.startsWith('/projects') || pathname.startsWith('/settings'))
}

export function shouldRedirectToProjects(pathname: string, authenticated: boolean): boolean {
  return authenticated && pathname === '/login'
}
