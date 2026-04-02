'use client'

import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { SignInButton } from './SignInButton'
import { shouldBlockForMaintenance } from '@/lib/auth/routeGuards'
import { usePathname } from 'next/navigation'
import { getLoginPageAccessState, getMaintenancePageAccessState } from '@/lib/auth/access-state'

function isE2EAuthBypassEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === 'true'
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const adminDefaults = useQuery(api.settings.getAdminDefaults)
  const adminCheck = useQuery(api.admin.checkIsAdmin)

  if (isE2EAuthBypassEnabled()) {
    return <>{children}</>
  }

  const registrationEnabled = adminDefaults?.registrationEnabled !== false
  const systemMaintenance = adminDefaults?.systemMaintenance === true
  const isAdmin = adminCheck?.isAdmin === true
  const showMaintenanceState = shouldBlockForMaintenance(
    pathname ?? '/',
    true,
    isAdmin,
    systemMaintenance
  )
  const loginState = getLoginPageAccessState({
    registrationEnabled,
    systemMaintenance,
  })
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
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-display text-2xl">Authentication Required</h1>
            <p className="text-muted-foreground">{loginState.message}</p>
            <SignInButton disabled={loginState.signInDisabled} />
          </div>
        </div>
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
