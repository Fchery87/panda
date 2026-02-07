'use client'

import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import { SignInButton } from './SignInButton'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === 'true') {
    return <>{children}</>
  }

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
            <p className="text-muted-foreground">Please sign in to access the dashboard.</p>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  )
}
