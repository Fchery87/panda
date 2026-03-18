// apps/web/hooks/useGit.test.ts
import { describe, it, expect, mock } from 'bun:test'

// We test the raw fetch functions, not the React hook
// (React hook testing requires a component harness)

describe('git API client functions', () => {
  it('exports gitStatus function', async () => {
    const mod = await import('./useGit')
    expect(typeof mod.gitStatus).toBe('function')
  })

  it('exports gitLog function', async () => {
    const mod = await import('./useGit')
    expect(typeof mod.gitLog).toBe('function')
  })

  it('exports gitBranches function', async () => {
    const mod = await import('./useGit')
    expect(typeof mod.gitBranches).toBe('function')
  })

  it('exports gitStage function', async () => {
    const mod = await import('./useGit')
    expect(typeof mod.gitStage).toBe('function')
  })

  it('exports gitUnstage function', async () => {
    const mod = await import('./useGit')
    expect(typeof mod.gitUnstage).toBe('function')
  })

  it('exports gitCommit function', async () => {
    const mod = await import('./useGit')
    expect(typeof mod.gitCommit).toBe('function')
  })
})
