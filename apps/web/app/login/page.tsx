'use client'

import { SignInButton } from '@/components/auth/SignInButton'
import { PandaLogo } from '@/components/ui/panda-logo'
import { Authenticated, AuthLoading, Unauthenticated } from '@/components/auth/ConvexAuthProvider'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { shouldAllowRegistration } from '@/lib/auth/routeGuards'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

function AuthenticatedRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.push('/projects')
  }, [router])

  return null
}

export default function LoginPage() {
  const adminDefaults = useQuery(api.settings.getAdminDefaults)
  const registrationEnabled = shouldAllowRegistration(adminDefaults?.registrationEnabled !== false)
  const systemMaintenance = adminDefaults?.systemMaintenance === true

  return (
    <>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center p-4 text-sm text-muted-foreground">
          Checking authentication...
        </div>
      </AuthLoading>
      <Authenticated>
        <AuthenticatedRedirect />
      </Authenticated>
      <Unauthenticated>
        <div
          id="main-content"
          className="flex min-h-screen flex-col items-center justify-center gap-8 p-4"
        >
          <div className="flex flex-col items-center gap-4">
            <PandaLogo size="lg" />
            <h1 className="text-display text-2xl">Welcome to Panda.ai</h1>
            <p className="text-muted-foreground">
              {systemMaintenance
                ? 'Maintenance mode is active. Only admins can sign in right now.'
                : registrationEnabled
                  ? 'Sign in to start coding with AI'
                  : 'Sign-in is temporarily disabled by an administrator.'}
            </p>
          </div>

          <SignInButton disabled={!registrationEnabled || systemMaintenance} />
        </div>
      </Unauthenticated>
    </>
  )
}
