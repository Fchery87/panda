"use client"

import { ConvexProvider, ConvexReactClient } from "convex/react"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "next-themes"
import { useMemo } from "react"

function MissingConvexConfig() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="max-w-xl w-full border border-border bg-muted/30 p-6">
        <h1 className="font-mono text-lg mb-3">Convex not configured</h1>
        <p className="text-sm text-muted-foreground mb-4">
          The app needs <code className="font-mono">NEXT_PUBLIC_CONVEX_URL</code> to connect to your
          Convex deployment.
        </p>
        <div className="text-sm space-y-2">
          <div className="font-mono text-xs text-muted-foreground">Local dev steps</div>
          <pre className="text-xs font-mono bg-background border border-border p-3 overflow-auto">
{`# in repo root
bunx convex dev

# create/update apps/web/.env.local with:
NEXT_PUBLIC_CONVEX_URL="https://<your-deployment>.convex.cloud"
`}
          </pre>
          <p className="text-xs text-muted-foreground">
            After setting it, restart the dev server.
          </p>
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
  )
}
