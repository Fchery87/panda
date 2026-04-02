import type { Metadata } from 'next'
import { Geist, Fira_Code } from 'next/font/google'
import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server'
import './globals.css'
import { Providers } from './providers'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const firaCode = Fira_Code({
  variable: '--font-fira-code',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    default: 'Panda.ai',
    template: '%s | Panda.ai',
  },
  description: 'Build software with AI assistance',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${firaCode.variable} antialiased`}>
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
