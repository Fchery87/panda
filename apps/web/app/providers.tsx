'use client'

import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from 'next-themes'
import { useMemo } from 'react'
import { ConvexAuthProvider } from '@/components/auth/ConvexAuthProvider'

function MissingConvexConfig() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-xl border border-border bg-muted/30 p-6">
        <h1 className="mb-3 font-mono text-lg">Convex not configured</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          The app needs <code className="font-mono">NEXT_PUBLIC_CONVEX_URL</code> to connect to your
          Convex deployment.
        </p>
        <div className="space-y-2 text-sm">
          <div className="font-mono text-xs text-muted-foreground">Local dev steps</div>
          <pre className="overflow-auto border border-border bg-background p-3 font-mono text-xs">
            {`# in repo root
bunx convex dev

# create/update apps/web/.env.local with:
NEXT_PUBLIC_CONVEX_URL="https://<your-deployment>.convex.cloud"
`}
          </pre>
          <p className="text-xs text-muted-foreground">After setting it, restart the dev server.</p>
        </div>
      </div>
    </div>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  const convex = useMemo(() => {
    if (!convexUrl) return null
    return new ConvexReactClient(convexUrl)
  }, [convexUrl])

  return (
    <ConvexAuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange={false}
      >
        {convex ? (
          <ConvexProvider client={convex}>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                },
              }}
            />
          </ConvexProvider>
        ) : (
          <MissingConvexConfig />
        )}
      </ThemeProvider>
    </ConvexAuthProvider>
  )
}
