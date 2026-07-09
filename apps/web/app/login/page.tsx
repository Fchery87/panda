'use client'

import { SignInButton } from '@/components/auth/SignInButton'
import { PandaLogo } from '@/components/ui/panda-logo'
import { ArrowRight } from 'lucide-react'
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
        <div className="flex min-h-screen items-center justify-center p-8 text-sm text-muted-foreground">
          Checking authentication...
        </div>
      </AuthLoading>
      <Authenticated>
        <AuthenticatedRedirect />
      </Authenticated>
      <Unauthenticated>
        <main
          id="main-content"
          className="dot-grid flex min-h-screen flex-col items-center justify-center gap-10 p-4"
        >
          <div className="flex w-full max-w-sm flex-col items-center gap-10">
            <div className="flex flex-col items-center gap-6 text-center">
              <PandaLogo size="xl" variant="icon" />
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight">
                  Sign in to Panda
                </h1>
                <p className="mt-3 text-muted-foreground">{accessState.message}</p>
              </div>
            </div>

            <div className="shadow-sharp-md w-full rounded-xl border border-border bg-card p-8">
              <div className="flex justify-center [&>*]:w-full">
                <SignInButton disabled={accessState.signInDisabled} />
              </div>

              {authError && (
                <div className="bg-destructive/10 mt-6 rounded-lg p-4 text-center">
                  <p className="text-sm text-destructive">Sign-in failed. Try again.</p>
                </div>
              )}
            </div>

            <p className="max-w-xs text-center text-xs leading-relaxed text-muted-foreground">
              Panda is a browser IDE where agents plan in the open and every run leaves receipts
              you can review.
            </p>

            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Back to home
                <ArrowRight size={12} />
              </Link>
              <Link
                href="/education"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                How Panda works
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </main>
      </Unauthenticated>
    </>
  )
}
