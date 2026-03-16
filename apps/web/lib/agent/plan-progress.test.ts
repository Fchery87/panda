import { describe, expect, it } from 'bun:test'
import {
  derivePlanCompletionStatus,
  derivePlanProgressMetadata,
  parsePlanSteps,
} from './plan-progress'

describe('plan progress helpers', () => {
  it('parses numbered implementation plan steps', () => {
    const planDraft = `## Goal
Ship the feature

## Implementation Plan
1. Update the plan review card.
2. Wire Build from Plan to execution.

## Validation
- Verify UI state`

    expect(parsePlanSteps(planDraft)).toEqual([
      'Update the plan review card.',
      'Wire Build from Plan to execution.',
    ])
  })

  it('tracks matched completed plan steps explicitly', () => {
    const planSteps = [
      'Update the plan review card in ChatInput.tsx',
      'Wire Build from Plan to execution in page.tsx',
      'Show run progress in RunProgressPanel.tsx',
    ]

    const first = derivePlanProgressMetadata(
      planSteps,
      'Updated the plan review card in ChatInput.tsx',
      'completed',
      []
    )

    expect(first).toEqual({
      planStepIndex: 0,
      planStepTitle: 'Update the plan review card in ChatInput.tsx',
      planTotalSteps: 3,
      completedPlanStepIndexes: [0],
    })

    const second = derivePlanProgressMetadata(
      planSteps,
      'Wiring Build from Plan to execution in page.tsx',
      'running',
      first!.completedPlanStepIndexes
    )

    expect(second).toEqual({
      planStepIndex: 1,
      planStepTitle: 'Wire Build from Plan to execution in page.tsx',
      planTotalSteps: 3,
      completedPlanStepIndexes: [0],
    })
  })

  it('derives partial plan completion when a run finishes without full step coverage', () => {
    expect(
      derivePlanCompletionStatus({
        planTotalSteps: 3,
        completedPlanStepIndexes: [0, 2],
        runOutcome: 'completed',
      })
    ).toBe('partial')

    expect(
      derivePlanCompletionStatus({
        planTotalSteps: 3,
        completedPlanStepIndexes: [0, 1, 2],
        runOutcome: 'completed',
      })
    ).toBe('completed')
  })

  it('treats failed runs as failed regardless of plan coverage', () => {
    expect(
      derivePlanCompletionStatus({
        planTotalSteps: 2,
        completedPlanStepIndexes: [0, 1],
        runOutcome: 'failed',
      })
    ).toBe('failed')
  })

  it('treats stopped runs as partial even when plan coverage is 100%', () => {
    expect(
      derivePlanCompletionStatus({
        planTotalSteps: 2,
        completedPlanStepIndexes: [0, 1],
        runOutcome: 'stopped',
      })
    ).toBe('partial')
  })
})
