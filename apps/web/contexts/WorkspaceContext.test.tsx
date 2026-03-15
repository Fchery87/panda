import { describe, expect, it } from 'bun:test'

describe('WorkspaceContext types', () => {
  it('exports WorkspaceProvider and useWorkspace', async () => {
    const mod = await import('./WorkspaceContext')

    expect(mod.WorkspaceProvider).toBeDefined()
    expect(mod.useWorkspace).toBeDefined()
  })
})
