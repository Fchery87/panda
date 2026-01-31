"use client"

import { ConvexProvider, ConvexReactClient } from "convex/react"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "next-themes"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
    >
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
    </ThemeProvider>
  )
}
