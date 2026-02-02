'use client'

import { SignInButton } from '@/components/auth/SignInButton'
import { PandaLogo } from '@/components/ui/panda-logo'
import { Authenticated, Unauthenticated } from '@/components/auth/ConvexAuthProvider'
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
  return (
    <>
      <Authenticated>
        <AuthenticatedRedirect />
      </Authenticated>
      <Unauthenticated>
        <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
          <div className="flex flex-col items-center gap-4">
            <PandaLogo size="lg" />
            <h1 className="text-display text-2xl">Welcome to Panda.ai</h1>
            <p className="text-muted-foreground">Sign in to start coding with AI</p>
          </div>

          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  )
}
