import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from '@convex-dev/auth/nextjs/server'
import { shouldRedirectToLogin, shouldRedirectToProjects } from '@/lib/auth/routeGuards'

const isProtectedRoute = createRouteMatcher(['/projects(.*)', '/settings(.*)'])
const isLoginRoute = createRouteMatcher(['/login'])

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (process.env.E2E_AUTH_BYPASS === 'true') {
    return
  }

  const authenticated = await convexAuth.isAuthenticated()
  if (isProtectedRoute(request) && shouldRedirectToLogin(request.nextUrl.pathname, authenticated)) {
    return nextjsMiddlewareRedirect(request, '/login')
  }
  if (isLoginRoute(request) && shouldRedirectToProjects(request.nextUrl.pathname, authenticated)) {
    return nextjsMiddlewareRedirect(request, '/projects')
  }
})

export const config = {
  // Run auth middleware on all app routes so Convex Auth can proxy /api/auth
  // actions and handle auth callbacks/token refresh consistently.
  matcher: ['/((?!_next|.*\\..*).*)'],
}
