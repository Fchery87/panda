import { describe, expect, it } from 'bun:test'

describe('useMobileLayout types', () => {
  it('exports useMobileLayout', async () => {
    const mod = await import('./useMobileLayout')

    expect(mod.useMobileLayout).toBeDefined()
  })
})
