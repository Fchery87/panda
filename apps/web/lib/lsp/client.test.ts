// apps/web/lib/lsp/client.test.ts
import { describe, it, expect } from 'bun:test'
import { LSPClient, getLSPClient, resetLSPClient } from './client'

describe('LSPClient', () => {
  it('creates an LSP client instance', () => {
    const client = new LSPClient()
    expect(client).toBeDefined()
    expect(client.connected).toBe(false)
  })

  it('exports getLSPClient function', () => {
    expect(typeof getLSPClient).toBe('function')
  })

  it('exports resetLSPClient function', () => {
    expect(typeof resetLSPClient).toBe('function')
  })
})
