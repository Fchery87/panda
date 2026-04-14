'use client'

import { SignInButton } from '@/components/auth/SignInButton'
import { PandaLogo } from '@/components/ui/panda-logo'
import { Authenticated, AuthLoading, Unauthenticated } from '@/components/auth/ConvexAuthProvider'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { getLoginPageAccessState } from '@/lib/auth/access-state'
import Link from 'next/link'

function AuthenticatedRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const redirect = searchParams.get('redirect') || '/projects'
    router.replace(redirect)
  }, [router, searchParams])

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
          className="dot-grid flex min-h-screen flex-col items-center justify-center gap-8 p-4"
        >
          <div className="flex w-full max-w-sm flex-col items-center gap-6">
            <PandaLogo size="lg" />

            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-display text-3xl">Sign in to Panda</h1>
              <p className="text-muted-foreground">{accessState.message}</p>
            </div>

            <div className="w-full border border-border bg-background p-6">
              <div className="space-y-4">
                <div className="border-b border-border pb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Continue with
                </div>
                <SignInButton disabled={accessState.signInDisabled} />
              </div>

              {authError && (
                <div className="mt-4 border border-destructive/50 bg-destructive/10 p-3 text-center">
                  <p className="font-mono text-sm text-destructive">
                    Sign-in failed. Please try again.
                  </p>
                </div>
              )}
            </div>

            <p className="max-w-xs text-center text-xs leading-relaxed text-muted-foreground">
              Panda is a browser-based AI coding workbench. Sign in to create projects, review
              plans, and build with the agent.
            </p>

            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="font-mono text-xs text-muted-foreground underline hover:text-foreground"
              >
                Back to Home
              </Link>
              <Link
                href="/education"
                className="font-mono text-xs text-muted-foreground underline hover:text-foreground"
              >
                Learn How It Works
              </Link>
            </div>
          </div>
        </main>
      </Unauthenticated>
    </>
  )
}
