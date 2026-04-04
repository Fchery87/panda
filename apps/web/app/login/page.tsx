'use client'

import { SignInButton } from '@/components/auth/SignInButton'
import { PandaLogo } from '@/components/ui/panda-logo'
import { Authenticated, AuthLoading, Unauthenticated } from '@/components/auth/ConvexAuthProvider'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { getLoginPageAccessState } from '@/lib/auth/access-state'

function AuthenticatedRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/projects')
  }, [router])

  return null
}

export default function LoginPage() {
  const adminDefaults = useQuery(api.settings.getAdminDefaults)
  const registrationEnabled = adminDefaults?.registrationEnabled !== false
  const systemMaintenance = adminDefaults?.systemMaintenance === true
  const searchParams = useSearchParams()
  const authError = searchParams.get('error')
  const accessState = getLoginPageAccessState({
    registrationEnabled,
    systemMaintenance,
  })

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
        <main
          id="main-content"
          className="flex min-h-screen flex-col items-center justify-center gap-8 p-4"
        >
          <div className="flex flex-col items-center gap-4">
            <PandaLogo size="lg" />
            <h1 className="text-display text-2xl">Welcome to Panda.ai</h1>
            <p className="text-muted-foreground">{accessState.message}</p>
          </div>

          <SignInButton disabled={accessState.signInDisabled} />

          {authError && (
            <div className="max-w-sm border border-destructive/50 bg-destructive/10 p-3 text-center">
              <p className="font-mono text-sm text-destructive">
                Sign-in failed. Please try again.
              </p>
            </div>
          )}

          <a
            href="/"
            className="font-mono text-sm text-muted-foreground underline hover:text-foreground"
          >
            Back to Home
          </a>
        </main>
      </Unauthenticated>
    </>
  )
}
