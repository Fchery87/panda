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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <PandaLogo className="h-12 w-12" />
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-label text-destructive">Error</span>
        <h1 className="font-mono text-2xl font-bold">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          An unexpected error occurred. This has been logged. Try again or head back to the
          workbench.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
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
    </main>
  )
}
