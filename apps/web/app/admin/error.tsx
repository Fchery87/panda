'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AdminError]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-mono text-2xl font-bold">Admin panel error</h1>
        <p className="text-sm text-muted-foreground">
          Something went wrong in the admin panel.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">
            Error digest: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button
          onClick={reset}
          className="rounded-none font-mono"
        >
          Try Again
        </Button>
        <Button
          variant="outline"
          className="rounded-none font-mono"
          onClick={() => { window.location.href = '/admin' }}
        >
          Admin Dashboard
        </Button>
      </div>
    </div>
  )
}
