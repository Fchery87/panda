'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { Button } from '@/components/ui/button'
import { Chrome } from 'lucide-react'

interface SignInButtonProps {
  disabled?: boolean
}

export function SignInButton({ disabled = false }: SignInButtonProps) {
  const { signIn } = useAuthActions()

  return (
    <Button
      onClick={() => signIn('google')}
      disabled={disabled}
      className="gap-2 rounded-none font-mono"
      variant="outline"
    >
      <Chrome className="h-4 w-4" />
      Sign in with Google
    </Button>
  )
}
