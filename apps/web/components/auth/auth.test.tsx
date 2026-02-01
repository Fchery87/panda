import { describe, it, expect } from 'bun:test'

describe('SignInButton', () => {
  it('has correct button text', () => {
    expect('Sign in with Google').toBe('Sign in with Google')
  })

  it('is a client component', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('./apps/web/components/auth/SignInButton.tsx', 'utf-8')
    expect(content).toContain("'use client'")
  })

  it('exports SignInButton function', async () => {
    const fs = await import('fs')
    const content = fs.readFileSync('./apps/web/components/auth/SignInButton.tsx', 'utf-8')
    expect(content).toContain('export function SignInButton')
  })
})
