import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { Inter } from 'next/font/google'
import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Panda.ai — AI Coding Workbench for the Browser',
    template: '%s | Panda.ai',
  },
  description:
    'Plan, approve, and build software in the browser. Panda is an AI coding workbench with plan review, execution approvals, resumable runs, and shared chat history.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${GeistMono.variable} antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:border focus:border-border focus:bg-background focus:px-3 focus:py-2 focus:font-mono focus:text-sm"
        >
          Skip to main content
        </a>
        <ConvexAuthNextjsServerProvider>
          <Providers>{children}</Providers>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  )
}
