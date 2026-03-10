import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from '@convex-dev/auth/nextjs/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { shouldRedirectToLogin, shouldRedirectToProjects } from '@/lib/auth/routeGuards'

const isProtectedRoute = createRouteMatcher(['/projects(.*)', '/settings(.*)'])
const isLoginRoute = createRouteMatcher(['/login'])

function isE2EAuthBypassEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.E2E_AUTH_BYPASS === 'true'
}

const authProxy = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isE2EAuthBypassEnabled()) {
    return
  }

  const authenticated = await convexAuth.isAuthenticated()
  const response =
    isProtectedRoute(request) && shouldRedirectToLogin(request.nextUrl.pathname, authenticated)
      ? nextjsMiddlewareRedirect(request, '/login')
      : isLoginRoute(request) && shouldRedirectToProjects(request.nextUrl.pathname, authenticated)
        ? nextjsMiddlewareRedirect(request, '/projects')
        : import('next/server').then(({ NextResponse }) => NextResponse.next())

  return Promise.resolve(response).then((res) => {
    if (res) {
      res.headers.set('X-Content-Type-Options', 'nosniff')
      res.headers.set('X-Frame-Options', 'DENY')
      res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
      res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    }
    return res
  })
})

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return authProxy(request, event)
}

export const proxyConfig = {
  // Run auth proxy on all app routes so Convex Auth can proxy /api/auth
  // actions and handle auth callbacks/token refresh consistently.
  matcher: ['/((?!_next|.*\\..*).*)'],
}
