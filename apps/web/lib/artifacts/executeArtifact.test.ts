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
    let queryCount = 0
    const convex = {
      query: async () => {
        queryCount += 1
        return queryCount === 1 ? { _id: 'file_1' } : { _id: 'file_1', path: 'src/app.ts' }
      },
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

  it('fails file artifact application when the project file tree cannot verify the write', async () => {
    const artifactStatusCalls: Array<{ id: string; status: string }> = []

    await expect(
      applyArtifact({
        artifactId: 'artifact_1' as never,
        action: {
          type: 'file_write',
          payload: { filePath: 'src/missing.ts', content: 'export {}' },
        },
        projectId: 'project_1' as never,
        convex: { query: async () => null } as never,
        upsertFile: (async () => undefined) as never,
        createAndExecuteJob: (async () => ({ jobId: 'job_1' })) as never,
        updateJobStatus: (async () => undefined) as never,
        updateArtifactStatus: (async (args: { id: string; status: string }) => {
          artifactStatusCalls.push(args)
        }) as never,
      })
    ).rejects.toThrow('not verified in the project file tree')

    expect(artifactStatusCalls.map((call) => call.status)).toEqual(['in_progress', 'failed'])
  })

  it('blocks risky artifact execution when advisor policy requires review', async () => {
    const statuses: string[] = []

    await expect(
      applyArtifact({
        artifactId: 'artifact_1' as never,
        action: {
          type: 'command_run',
          payload: { command: 'rm -rf tmp' },
        },
        projectId: 'project_1' as never,
        convex: { query: async () => null } as never,
        upsertFile: (async () => undefined) as never,
        createAndExecuteJob: (async () => ({ jobId: 'job_1' })) as never,
        updateJobStatus: (async () => undefined) as never,
        updateArtifactStatus: (async (args: { status: string }) => {
          statuses.push(args.status)
        }) as never,
        advisorPolicy: {
          enabled: true,
          requiredFor: ['destructive_command'],
          reasoningEffort: 'high',
        },
      })
    ).rejects.toThrow('Advisor review is required')

    expect(statuses).toEqual(['in_progress', 'failed'])
  })

  it('allows risky artifact execution after advisor approval flag is supplied', async () => {
    const commands: string[] = []
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ stdout: '', stderr: '', exitCode: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch

    try {
      await applyArtifact({
      artifactId: 'artifact_1' as never,
      action: {
        type: 'command_run',
        payload: { command: 'rm -rf tmp' },
      },
      projectId: 'project_1' as never,
      convex: { query: async () => null } as never,
      upsertFile: (async () => undefined) as never,
      createAndExecuteJob: (async (args: { command: string }) => {
        commands.push(args.command)
        return { jobId: 'job_1' as never }
      }) as never,
      updateJobStatus: (async () => undefined) as never,
      updateArtifactStatus: (async () => undefined) as never,
      advisorPolicy: {
        enabled: true,
        requiredFor: ['destructive_command'],
        reasoningEffort: 'high',
      },
        advisorApproved: true,
      })
    } finally {
      globalThis.fetch = originalFetch
    }

    expect(commands).toEqual(['rm -rf tmp'])
  })

  it('allows risky artifact execution after persisted advisor review approval', async () => {
    const commands: string[] = []
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ stdout: '', stderr: '', exitCode: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch

    try {
      await applyArtifact({
        artifactId: 'artifact_1' as never,
        action: {
          type: 'command_run',
          payload: { command: 'rm -rf tmp' },
        },
        projectId: 'project_1' as never,
        convex: { query: async () => null } as never,
        upsertFile: (async () => undefined) as never,
        createAndExecuteJob: (async (args: { command: string }) => {
          commands.push(args.command)
          return { jobId: 'job_1' as never }
        }) as never,
        updateJobStatus: (async () => undefined) as never,
        updateArtifactStatus: (async () => undefined) as never,
        advisorPolicy: {
          enabled: true,
          requiredFor: ['destructive_command'],
          reasoningEffort: 'high',
        },
        advisorReview: { status: 'approved', summary: 'Safe in test fixture.', risks: [] },
      })
    } finally {
      globalThis.fetch = originalFetch
    }

    expect(commands).toEqual(['rm -rf tmp'])
  })

  it('blocks risky artifact execution after persisted advisor review requests changes', async () => {
    await expect(
      applyArtifact({
        artifactId: 'artifact_1' as never,
        action: {
          type: 'command_run',
          payload: { command: 'rm -rf tmp' },
        },
        projectId: 'project_1' as never,
        convex: { query: async () => null } as never,
        upsertFile: (async () => undefined) as never,
        createAndExecuteJob: (async () => ({ jobId: 'job_1' })) as never,
        updateJobStatus: (async () => undefined) as never,
        updateArtifactStatus: (async () => undefined) as never,
        advisorPolicy: {
          enabled: true,
          requiredFor: ['destructive_command'],
          reasoningEffort: 'high',
        },
        advisorReview: {
          status: 'needs_changes',
          summary: 'Use a scoped delete instead.',
          risks: [],
        },
      })
    ).rejects.toThrow('Use a scoped delete instead')
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
      convex: {
        query: async () => ({ _id: 'file_1', path: 'src/app.ts' }),
      } as never,
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

  it('normalizes absolute artifact paths before applying them to the project tree', async () => {
    const queriedPaths: string[] = []
    const upsertedPaths: string[] = []
    const runtimeWrites: Array<{ path: string; content: string }> = []

    await applyArtifact({
      artifactId: 'artifact_1' as never,
      action: {
        type: 'file_write',
        payload: { filePath: '/docs/index.md', content: '# Docs\n' },
      },
      projectId: 'project_1' as never,
      convex: {
        query: async (_api: unknown, args: { path: string }) => {
          queriedPaths.push(args.path)
          return queriedPaths.length === 1 ? null : { _id: 'file_1', path: args.path }
        },
      } as never,
      upsertFile: (async (args: { path: string }) => {
        upsertedPaths.push(args.path)
      }) as never,
      createAndExecuteJob: (async () => ({ jobId: 'job_1' })) as never,
      updateJobStatus: (async () => undefined) as never,
      updateArtifactStatus: (async () => undefined) as never,
      writeFileToRuntime: async (path, content) => {
        runtimeWrites.push({ path, content })
      },
    })

    expect(queriedPaths).toEqual(['docs/index.md', 'docs/index.md'])
    expect(upsertedPaths).toEqual(['docs/index.md'])
    expect(runtimeWrites).toEqual([{ path: 'docs/index.md', content: '# Docs\n' }])
  })
})
