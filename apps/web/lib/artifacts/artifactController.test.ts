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
      advisorPolicy: {
        enabled: true,
        requiredFor: ['destructive_command'],
        reasoningEffort: 'high',
      },
    })

    const request = controller.requestAdvisorReview('artifact_1')
    expect(request).toMatchObject({ artifactId: 'artifact_1', gates: ['destructive_command'] })
    expect(request?.prompt).toContain('rm -rf tmp')
  })

  it('passes the advisor policy and matching advisor review into artifact execution', async () => {
    const record: ArtifactControllerRecord = {
      _id: 'artifact_1' as never,
      actions: [{ type: 'command_run', payload: { command: 'rm -rf tmp' } }],
      status: 'pending',
      createdAt: 1,
    }
    const reviews: unknown[] = []
    const policies: unknown[] = []

    const controller = createArtifactController({
      records: [record],
      projectId: 'project_1' as never,
      advisorReviews: [
        {
          status: 'blocked',
          summary: 'Wrong artifact.',
          risks: [],
          artifactId: 'artifact_2',
          createdAt: 2,
        },
        {
          status: 'approved',
          summary: 'Approved.',
          risks: [],
          artifactId: 'artifact_1',
          createdAt: 1,
        },
      ],
      advisorPolicy: {
        enabled: true,
        requiredFor: ['destructive_command'],
        reasoningEffort: 'high',
      },
      applyArtifact: async (args) => {
        policies.push(args.advisorPolicy)
        reviews.push(args.advisorReview)
        return {
          kind: 'command',
          description: args.action.type === 'command_run' ? args.action.payload.command : '',
        }
      },
      updateArtifactStatus: async () => undefined,
    })

    await controller.applyOne('artifact_1')

    expect(policies).toEqual([
      {
        enabled: true,
        requiredFor: ['destructive_command'],
        reasoningEffort: 'high',
      },
    ])
    expect(reviews).toEqual([
      {
        status: 'approved',
        summary: 'Approved.',
        risks: [],
        artifactId: 'artifact_1',
        createdAt: 1,
      },
    ])
  })

  it('defers gated artifacts without approved review instead of marking them failed', async () => {
    const record: ArtifactControllerRecord = {
      _id: 'artifact_1' as never,
      actions: [{ type: 'command_run', payload: { command: 'rm -rf tmp' } }],
      status: 'pending',
      createdAt: 1,
    }
    const applyCalls: string[] = []

    const controller = createArtifactController({
      records: [record],
      projectId: 'project_1' as never,
      advisorPolicy: {
        enabled: true,
        requiredFor: ['destructive_command'],
        reasoningEffort: 'high',
      },
      applyArtifact: async (args) => {
        applyCalls.push(args.artifactId)
        return { kind: 'command', description: 'rm -rf tmp' }
      },
      updateArtifactStatus: async () => undefined,
    })

    const result = await controller.applyOne('artifact_1')

    expect(result).toBe(null)
    expect(applyCalls).toEqual([])
  })

  it('defers gated artifacts with non-approved review instead of marking them failed', async () => {
    const record: ArtifactControllerRecord = {
      _id: 'artifact_1' as never,
      actions: [{ type: 'command_run', payload: { command: 'rm -rf tmp' } }],
      status: 'pending',
      createdAt: 1,
    }
    const applyCalls: string[] = []

    const controller = createArtifactController({
      records: [record],
      projectId: 'project_1' as never,
      advisorReviews: [
        {
          status: 'needs_changes',
          summary: 'Needs work.',
          risks: [],
          artifactId: 'artifact_1',
          createdAt: 1,
        },
      ],
      advisorPolicy: {
        enabled: true,
        requiredFor: ['destructive_command'],
        reasoningEffort: 'high',
      },
      applyArtifact: async (args) => {
        applyCalls.push(args.artifactId)
        return { kind: 'command', description: 'rm -rf tmp' }
      },
      updateArtifactStatus: async () => undefined,
    })

    const result = await controller.applyOne('artifact_1')

    expect(result).toBe(null)
    expect(applyCalls).toEqual([])
  })
})
