import { describe, expect, test } from 'bun:test'

describe('useRuntimePreview exports', () => {
  test('exports useRuntimePreview', async () => {
    const mod = await import('./useRuntimePreview')
    expect(mod.useRuntimePreview).toBeDefined()
  })
})
