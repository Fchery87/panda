'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[DashboardError]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-mono text-2xl font-bold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          An error occurred while loading the dashboard.
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
            window.location.href = '/projects'
          }}
        >
          Back to Projects
        </Button>
      </div>
    </div>
  )
}
