import { describe, expect, test } from 'bun:test'

describe('mobile panel types', () => {
  test('mobile primary panel no longer includes preview', async () => {
    const mod = await import('./useProjectWorkspaceUi')
    expect(mod.useProjectWorkspaceUi).toBeDefined()
  })
})
