import { describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'

mock.module('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Inter: () => ({ variable: '--font-sans' }),
  Schibsted_Grotesk: () => ({ variable: '--font-sans' }),
  Bricolage_Grotesque: () => ({ variable: '--font-display' }),
  Fira_Code: () => ({ variable: '--font-fira-code' }),
  Plus_Jakarta_Sans: () => ({ variable: '--font-sans' }),
  JetBrains_Mono: () => ({ variable: '--font-mono' }),
}))

mock.module('geist/font/mono', () => ({
  GeistMono: { variable: '--font-mono' },
}))

mock.module('server-only', () => ({}))
mock.module('@convex-dev/auth/nextjs/server', () => ({
  ConvexAuthNextjsServerProvider: ({ children }: { children: React.ReactNode }) => children,
}))
mock.module('./providers', () => ({
  Providers: ({ children }: { children: React.ReactNode }) => children,
}))

process.env.NEXT_PUBLIC_CONVEX_URL = 'https://example.convex.cloud'

describe('RootLayout', () => {
  test('renders a skip link to the main content region', async () => {
    const { default: RootLayout } = await import('./layout')

    const html = renderToStaticMarkup(
      <RootLayout>
        <main id="main-content">Hello</main>
      </RootLayout>
    )

    expect(html).toContain('href="#main-content"')
    expect(html).toContain('Skip to main content')
  })

  test('publishes project icons from the current Panda logo mark', async () => {
    const { metadata } = await import('./layout')

    expect(metadata.icons).toEqual({
      icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
      shortcut: ['/icon.svg'],
      apple: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    })
  })
})
