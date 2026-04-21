'use client'

import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { shouldBlockForMaintenance } from '@/lib/auth/routeGuards'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getMaintenancePageAccessState } from '@/lib/auth/access-state'
import { useEffect } from 'react'

function UnauthenticatedRedirect() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`)
  }, [router, pathname, searchParams])

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
        <div className="h-4 w-4 animate-spin border-2 border-primary border-t-transparent" />
        Redirecting to login...
      </div>
    </div>
  )
}

function isE2EAuthBypassEnabled(searchParams: ReturnType<typeof useSearchParams>): boolean {
  const secret = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS_SECRET
  return (
    process.env.NODE_ENV !== 'production' &&
    Boolean(secret) &&
    searchParams.get('e2eBypassSecret') === secret
  )
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const adminDefaults = useQuery(api.settings.getAdminDefaults)
  const adminCheck = useQuery(api.admin.checkIsAdmin)

  if (isE2EAuthBypassEnabled(searchParams)) {
    return <>{children}</>
  }

  const systemMaintenance = adminDefaults?.systemMaintenance === true
  const isAdmin = adminCheck?.isAdmin === true
  const showMaintenanceState = shouldBlockForMaintenance(
    pathname ?? '/',
    true,
    isAdmin,
    systemMaintenance
  )
  const maintenanceState = getMaintenancePageAccessState('maintenance')

  return (
    <>
      <AuthLoading>
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin border-2 border-primary border-t-transparent" />
            Loading...
          </div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <UnauthenticatedRedirect />
      </Unauthenticated>
      <Authenticated>
        {showMaintenanceState ? (
          <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="flex max-w-md flex-col items-center gap-4 text-center">
              <h1 className="text-display text-2xl">{maintenanceState.title}</h1>
              <p className="text-muted-foreground">{maintenanceState.message}</p>
            </div>
          </div>
        ) : (
          children
        )}
      </Authenticated>
    </>
  )
}
