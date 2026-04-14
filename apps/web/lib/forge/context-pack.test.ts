import { describe, expect, test } from 'bun:test'
import { buildForgeContextPack } from './context-pack'
import { parseWorkerResult } from './result-parser'
import type { ForgeTaskRecord } from './types'

function makeTask(overrides: Partial<ForgeTaskRecord> = {}): ForgeTaskRecord {
  return {
    id: 'task_1',
    taskKey: 'task-1',
    title: 'Implement Forge snapshot',
    description: 'Build the canonical project snapshot query.',
    rationale: 'The workbench needs one source of truth.',
    ownerRole: 'builder',
    dependencies: [],
    filesInScope: ['convex/forge.ts', 'convex/schema.ts'],
    routesInScope: ['/projects/[projectId]'],
    constraints: ['Keep migrations additive'],
    acceptanceCriteria: [
      {
        id: 'ac-1',
        text: 'Snapshot exposes current phase and active role.',
        status: 'pending',
        verificationMethod: 'integration',
      },
    ],
    testRequirements: ['Add a snapshot query test'],
    reviewRequirements: ['Executive review of the read-model shape'],
    qaRequirements: ['Validate the project route'],
    blockers: [],
    status: 'ready',
    evidence: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('forge context pack', () => {
  test('builds a task-scoped builder context pack', () => {
    const pack = buildForgeContextPack({
      projectId: 'project_1',
      deliveryStateId: 'delivery_state_1',
      role: 'builder',
      task: makeTask(),
      decisions: [
        {
          id: 'decision_1',
          category: 'architecture',
          summary: 'Use Convex as the canonical state store.',
          relatedTaskIds: ['task_1'],
          relatedFilePaths: ['convex/forge.ts'],
          createdByRole: 'executive',
          createdAt: 10,
        },
      ],
      recentChangesDigest: 'No relevant changes yet.',
      nextStepBrief: 'Write the failing snapshot query tests first.',
      excludedContext: ['Ignore unrelated admin pages'],
    })

    expect(pack.role).toBe('builder')
    expect(pack.taskId).toBe('task_1')
    expect(pack.filesInScope).toEqual(['convex/forge.ts', 'convex/schema.ts'])
    expect(pack.reviewRequirements).toContain('Executive review of the read-model shape')
    expect(pack.excludedContext).toContain('Ignore unrelated admin pages')
  })

  test('parses a valid structured worker result payload', () => {
    const result = parseWorkerResult(
      JSON.stringify({
        outcome: 'completed',
        summary: 'Implemented the snapshot query and added tests.',
        filesTouched: ['convex/forge.ts'],
        testsWritten: ['convex/forge.test.ts'],
        testsRun: [
          {
            command: 'bun test convex/forge.test.ts',
            status: 'passed',
          },
        ],
        evidenceRefs: ['artifact:test:snapshot-query'],
        unresolvedRisks: [],
        followUpActions: [],
        suggestedTaskStatus: 'in_review',
      })
    )

    expect(result.outcome).toBe('completed')
    expect(result.testsRun[0]?.status).toBe('passed')
    expect(result.suggestedTaskStatus).toBe('in_review')
  })

  test('rejects malformed worker result payloads', () => {
    expect(() => parseWorkerResult('not-json')).toThrow(/worker result/i)
    expect(() =>
      parseWorkerResult(
        JSON.stringify({
          outcome: 'completed',
          summary: 'Missing the rest of the contract',
        })
      )
    ).toThrow(/worker result/i)
  })

  test('includes phase and gate snapshot from delivery state', () => {
    const pack = buildForgeContextPack({
      projectId: 'project_1',
      deliveryStateId: 'delivery_state_1',
      role: 'builder',
      task: makeTask(),
      recentChangesDigest: 'No changes.',
      phase: 'review',
      gates: {
        architecture_review: 'passed',
        implementation_review: 'pending',
        qa_review: 'not_required',
        ship_review: 'not_required',
      },
    })

    expect(pack.phase).toBe('review')
    expect(pack.gates?.implementation_review).toBe('pending')
    expect(pack.gates?.architecture_review).toBe('passed')
  })
})
