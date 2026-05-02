'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

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
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-label text-destructive">Error</span>
        <h1 className="font-mono text-2xl font-bold">Admin panel error</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Something went wrong loading this admin panel. This has been logged.
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
            window.location.href = '/admin'
          }}
        >
          <ArrowLeft size={16} className="mr-2" />
          Admin Dashboard
        </Button>
      </div>
    </div>
  )
}
