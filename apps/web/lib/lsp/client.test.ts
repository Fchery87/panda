// apps/web/lib/lsp/client.test.ts
import { describe, it, expect } from 'bun:test'
import { LSPClient } from './client'

describe('LSPClient', () => {
  it('creates an LSP client instance', () => {
    const client = new LSPClient()
    expect(client).toBeDefined()
    expect(client.connected).toBe(false)
  })

  it('exports getLSPClient function', () => {
    const { getLSPClient } = require('./client')
    expect(typeof getLSPClient).toBe('function')
  })

  it('exports resetLSPClient function', () => {
    const { resetLSPClient } = require('./client')
    expect(typeof resetLSPClient).toBe('function')
  })
})
