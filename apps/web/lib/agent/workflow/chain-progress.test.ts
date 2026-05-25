import { describe, expect, test } from 'bun:test'
import { advanceWorkflowChainForArtifact } from './chain-progress'

describe('workflow chain progress', () => {
  test('completes the first pending step matching an artifact stage', () => {
    const result = advanceWorkflowChainForArtifact({
      sourceStage: 'research',
      artifactId: 'artifact_1',
      now: 100,
      chain: {
        status: 'running',
        currentStepId: 'research',
        steps: [
          { id: 'research', stage: 'research', status: 'running' },
          { id: 'design', stage: 'design', status: 'pending' },
        ],
      },
    })

    expect(result.steps[0]).toMatchObject({ status: 'completed', artifactId: 'artifact_1' })
    expect(result.currentStepId).toBe('design')
    expect(result.status).toBe('running')
  })

  test('marks chain completed when all steps are done', () => {
    const result = advanceWorkflowChainForArtifact({
      sourceStage: 'plan',
      artifactId: 'artifact_2',
      now: 200,
      chain: {
        status: 'running',
        currentStepId: 'plan',
        steps: [
          { id: 'research', stage: 'research', status: 'completed' },
          { id: 'plan', stage: 'plan', status: 'running' },
        ],
      },
    })

    expect(result.status).toBe('completed')
    expect(result.completedAt).toBe(200)
    expect(result.currentStepId).toBeUndefined()
  })
})
