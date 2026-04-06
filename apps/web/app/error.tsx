'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { PandaLogo } from '@/components/ui/panda-logo'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <PandaLogo className="h-12 w-12" />
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-mono text-2xl font-bold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">Error digest: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} className="rounded-none font-mono">
          Try Again
        </Button>
        <Button
          variant="outline"
          className="rounded-none font-mono"
          onClick={() => {
            window.location.href = '/'
          }}
        >
          Go Home
        </Button>
      </div>
    </div>
  )
}
