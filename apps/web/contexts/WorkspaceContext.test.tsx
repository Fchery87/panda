import { describe, expect, it } from 'bun:test'

describe('WorkspaceContext types', () => {
  it('exports workspace tab helpers', async () => {
    const mod = await import('./WorkspaceContext')

    expect(mod.isWorkspacePlanTab).toBeDefined()
  })
})
