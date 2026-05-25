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

  it('builds advisor review requests for gated artifacts', () => {
    const record: ArtifactControllerRecord = {
      _id: 'artifact_1' as never,
      actions: [{ type: 'command_run', payload: { command: 'rm -rf tmp' } }],
      status: 'pending',
      createdAt: 1,
    }

    const controller = createArtifactController({
      records: [record],
      projectId: 'project_1' as never,
      applyArtifact: async () => ({ kind: 'command', description: 'rm -rf tmp' }),
      updateArtifactStatus: async () => undefined,
      advisorPolicy: { enabled: true, requiredFor: ['destructive_command'], reasoningEffort: 'high' },
    })

    const request = controller.requestAdvisorReview('artifact_1')
    expect(request).toMatchObject({ artifactId: 'artifact_1', gates: ['destructive_command'] })
    expect(request?.prompt).toContain('rm -rf tmp')
  })

  it('passes the matching advisor review into artifact execution', async () => {
    const record: ArtifactControllerRecord = {
      _id: 'artifact_1' as never,
      actions: [{ type: 'command_run', payload: { command: 'rm -rf tmp' } }],
      status: 'pending',
      createdAt: 1,
    }
    const reviews: unknown[] = []

    const controller = createArtifactController({
      records: [record],
      projectId: 'project_1' as never,
      advisorReviews: [
        { status: 'blocked', summary: 'Wrong artifact.', risks: [], artifactId: 'artifact_2', createdAt: 2 },
        { status: 'approved', summary: 'Approved.', risks: [], artifactId: 'artifact_1', createdAt: 1 },
      ],
      applyArtifact: async (args) => {
        reviews.push(args.advisorReview)
        return { kind: 'command', description: args.action.type === 'command_run' ? args.action.payload.command : '' }
      },
      updateArtifactStatus: async () => undefined,
    })

    await controller.applyOne('artifact_1')

    expect(reviews).toEqual([
      { status: 'approved', summary: 'Approved.', risks: [], artifactId: 'artifact_1', createdAt: 1 },
    ])
  })
})
