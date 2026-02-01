'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { Button } from '@/components/ui/button'
import { Chrome } from 'lucide-react'

export function SignInButton() {
  const { signIn } = useAuthActions()

  return (
    <Button
      onClick={() => signIn('google')}
      className="gap-2 rounded-none font-mono"
      variant="outline"
    >
      <Chrome className="h-4 w-4" />
      Sign in with Google
    </Button>
  )
}
