import { describe, expect, it } from 'bun:test'

import { createArtifactController, type ArtifactControllerRecord } from './artifactController'

describe('artifact controller', () => {
  it('applies one pending artifact through the shared artifact executor', async () => {
    const record: ArtifactControllerRecord = {
      _id: 'artifact_1' as never,
      actions: [{ type: 'file_write', payload: { filePath: 'src/app.ts', content: 'export {}' } }],
      status: 'pending',
      createdAt: 1,
    }
    const applyCalls: Array<{ artifactId: string; projectId: string }> = []

    const controller = createArtifactController({
      records: [record],
      projectId: 'project_1' as never,
      applyArtifact: async (args) => {
        applyCalls.push({ artifactId: args.artifactId, projectId: args.projectId })
        return { kind: 'file', description: 'src/app.ts' }
      },
      updateArtifactStatus: async () => undefined,
    })

    const result = await controller.applyOne('artifact_1')

    expect(result).toEqual({ kind: 'file', description: 'src/app.ts' })
    expect(applyCalls).toEqual([{ artifactId: 'artifact_1', projectId: 'project_1' }])
  })
})
