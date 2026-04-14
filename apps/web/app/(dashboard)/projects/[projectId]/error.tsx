'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function WorkbenchError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[WorkbenchError]', error)
  }, [error])

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-label text-destructive">Error</span>
        <h1 className="font-mono text-2xl font-bold">Workbench error</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Something went wrong loading this project. Your files and chat history are safe — this is
          a display error.
        </p>
        {process.env.NODE_ENV !== 'production' && error.message ? (
          <pre className="max-w-2xl overflow-auto border border-border bg-muted/40 p-3 text-left font-mono text-xs text-muted-foreground">
            {error.message}
          </pre>
        ) : null}
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} className="rounded-none font-mono">
          Reload Workbench
        </Button>
        <Button
          variant="outline"
          className="rounded-none font-mono"
          onClick={() => {
            window.location.href = '/projects'
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>
    </div>
  )
}
