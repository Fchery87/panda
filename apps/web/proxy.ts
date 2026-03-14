import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from '@convex-dev/auth/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { api } from '@convex/_generated/api'
import {
  shouldRedirectToLogin,
  shouldRedirectToLoginDisabled,
  shouldRedirectToMaintenance,
  shouldRedirectToProjects,
} from '@/lib/auth/routeGuards'

const isProtectedRoute = createRouteMatcher(['/projects(.*)', '/settings(.*)', '/admin(.*)'])
const isLoginRoute = createRouteMatcher(['/login'])

function isE2EAuthBypassEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.E2E_AUTH_BYPASS === 'true'
}

async function getAdminDefaults() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) {
    return null
  }

  const convex = new ConvexHttpClient(convexUrl)
  try {
    return await convex.query(api.settings.getAdminDefaults, {})
  } catch {
    return null
  }
}

const authProxy = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isE2EAuthBypassEnabled()) {
    return
  }

  const authenticated = await convexAuth.isAuthenticated()
  const adminDefaults = await getAdminDefaults()
  const registrationEnabled = adminDefaults?.registrationEnabled !== false
  const systemMaintenance = adminDefaults?.systemMaintenance === true
  const response =
    isProtectedRoute(request) &&
    shouldRedirectToMaintenance(request.nextUrl.pathname, authenticated, systemMaintenance)
      ? nextjsMiddlewareRedirect(request, '/maintenance')
      : isLoginRoute(request) &&
          shouldRedirectToLoginDisabled(
            request.nextUrl.pathname,
            authenticated,
            registrationEnabled,
            systemMaintenance
          )
        ? nextjsMiddlewareRedirect(
            request,
            systemMaintenance ? '/maintenance' : '/maintenance?reason=registration-closed'
          )
        : isProtectedRoute(request) &&
            shouldRedirectToLogin(request.nextUrl.pathname, authenticated)
          ? nextjsMiddlewareRedirect(request, '/login')
          : isLoginRoute(request) &&
              shouldRedirectToProjects(request.nextUrl.pathname, authenticated)
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
