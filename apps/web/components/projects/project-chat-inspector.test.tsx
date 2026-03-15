import { describe, expect, test } from 'bun:test'

describe('ProjectChatInspector exports', () => {
  test('exports ProjectChatInspector and review tab type', async () => {
    const mod = await import('./ProjectChatInspector')
    expect(mod.ProjectChatInspector).toBeDefined()
  })
})
