import { describe, expect, test } from 'bun:test'
import { applyArtifact } from './executeArtifact'

describe('artifact apply file-tree visibility regression', () => {
  test('a file_write artifact is only completed after list/get source of truth can observe the file', async () => {
    const files = new Map<string, { _id: string; path: string; content: string }>()
    const statuses: string[] = []

    await applyArtifact({
      artifactId: 'artifact_1' as never,
      action: {
        type: 'file_write',
        payload: { filePath: 'docs/generated/.gitkeep', content: '' },
      },
      projectId: 'project_1' as never,
      convex: {
        query: async (_ref: unknown, args: { path: string }) => files.get(args.path) ?? null,
      } as never,
      upsertFile: (async (args: { path: string; content: string }) => {
        files.set(args.path, { _id: 'file_1', path: args.path, content: args.content })
      }) as never,
      createAndExecuteJob: (async () => ({ jobId: 'job_1' })) as never,
      updateJobStatus: (async () => undefined) as never,
      updateArtifactStatus: (async (args: { status: string }) => {
        statuses.push(args.status)
      }) as never,
    })

    expect(statuses).toEqual(['in_progress', 'completed'])
    expect([...files.keys()]).toContain('docs/generated/.gitkeep')
  })
})
