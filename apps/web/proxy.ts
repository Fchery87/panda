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
import { getMaintenanceRedirectReason } from '@/lib/auth/access-state'

const isProtectedRoute = createRouteMatcher(['/projects(.*)', '/settings(.*)', '/admin(.*)'])
const isLoginRoute = createRouteMatcher(['/login'])

function isE2EAuthBypassEnabled(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false
  }

  const secret = process.env.E2E_AUTH_BYPASS_SECRET
  return (
    (Boolean(secret) && request.nextUrl.searchParams.get('e2eBypassSecret') === secret) ||
    request.nextUrl.searchParams.get('e2eBypass') === '1'
  )
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
  if (isE2EAuthBypassEnabled(request)) {
    return
  }

  const authenticated = await convexAuth.isAuthenticated()
  const adminDefaults = await getAdminDefaults()
  const registrationEnabled = adminDefaults?.registrationEnabled !== false
  const systemMaintenance = adminDefaults?.systemMaintenance === true
  const maintenanceReason = getMaintenanceRedirectReason(systemMaintenance)
  const response =
    isProtectedRoute(request) &&
    shouldRedirectToMaintenance(request.nextUrl.pathname, authenticated, systemMaintenance)
      ? nextjsMiddlewareRedirect(request, `/maintenance?reason=${maintenanceReason}`)
      : isLoginRoute(request) &&
          shouldRedirectToLoginDisabled(
            request.nextUrl.pathname,
            authenticated,
            registrationEnabled,
            systemMaintenance
          )
        ? nextjsMiddlewareRedirect(request, `/maintenance?reason=${maintenanceReason}`)
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
