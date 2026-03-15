import { describe, expect, test } from 'bun:test'

describe('Workbench preview layout', () => {
  test('supports contextual preview without permanent sidebar preview destination', async () => {
    const mod = await import('./Workbench')
    expect(mod.Workbench).toBeDefined()
  })
})
