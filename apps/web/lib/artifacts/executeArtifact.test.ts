import { describe, expect, it } from 'bun:test'
import { applyArtifact, getPrimaryArtifactAction, inferArtifactJobType } from './executeArtifact'

describe('artifact execution helpers', () => {
  it('extracts the primary supported action', () => {
    const action = getPrimaryArtifactAction({
      actions: [{ type: 'file_write', payload: { filePath: 'src/app.ts', content: 'x' } }],
    })

    expect(action?.type).toBe('file_write')
  })

  it('infers job types from command text', () => {
    expect(inferArtifactJobType('bun run build')).toBe('build')
    expect(inferArtifactJobType('bun test')).toBe('test')
    expect(inferArtifactJobType('echo hello')).toBe('cli')
  })

  it('applies file artifacts through the shared execution path', async () => {
    const artifactStatusCalls: Array<{ id: string; status: string }> = []
    const convex = {
      query: async () => ({ _id: 'file_1' }),
    }
    const upsertFileCalls: Array<Record<string, unknown>> = []
    const upsertFile = async (args: Record<string, unknown>) => {
      upsertFileCalls.push(args)
    }
    const createAndExecuteJobCalls: Array<Record<string, unknown>> = []
    const createAndExecuteJob = async (args: Record<string, unknown>) => {
      createAndExecuteJobCalls.push(args)
      return { jobId: 'job_1' as never }
    }
    const updateJobStatus = async () => undefined
    const updateArtifactStatus = async (args: { id: string; status: string }) => {
      artifactStatusCalls.push(args)
    }

    const result = await applyArtifact({
      artifactId: 'artifact_1' as never,
      action: {
        type: 'file_write',
        payload: { filePath: 'src/app.ts', content: 'export {}' },
      },
      projectId: 'project_1' as never,
      convex: convex as never,
      upsertFile: upsertFile as never,
      createAndExecuteJob: createAndExecuteJob as never,
      updateJobStatus,
      updateArtifactStatus: updateArtifactStatus as never,
    })

    expect(result).toEqual({ kind: 'file', description: 'src/app.ts' })
    expect(upsertFileCalls[0]?.path).toBe('src/app.ts')
    expect(upsertFileCalls[0]?.content).toBe('export {}')
    expect(createAndExecuteJobCalls.length).toBe(0)
    expect(artifactStatusCalls[0]).toEqual({
      id: 'artifact_1',
      status: 'in_progress',
    })
    expect(artifactStatusCalls[1]).toEqual({
      id: 'artifact_1',
      status: 'completed',
    })
  })

  it('writes file artifacts through to the runtime when provided', async () => {
    const runtimeWrites: Array<{ path: string; content: string }> = []

    await applyArtifact({
      artifactId: 'artifact_1' as never,
      action: {
        type: 'file_write',
        payload: { filePath: 'src/app.ts', content: 'export const value = 1' },
      },
      projectId: 'project_1' as never,
      convex: { query: async () => null } as never,
      upsertFile: (async () => undefined) as never,
      createAndExecuteJob: (async () => ({ jobId: 'job_1' })) as never,
      updateJobStatus: (async () => undefined) as never,
      updateArtifactStatus: (async () => undefined) as never,
      writeFileToRuntime: async (path, content) => {
        runtimeWrites.push({ path, content })
      },
    })

    expect(runtimeWrites).toEqual([{ path: 'src/app.ts', content: 'export const value = 1' }])
  })
})
