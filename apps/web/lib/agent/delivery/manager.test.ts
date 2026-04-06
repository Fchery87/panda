import { describe, expect, test } from 'bun:test'
import {
  deriveDeliveryTaskSeed,
  deriveFinalLifecycleUpdatesFromQa,
  deriveLifecycleUpdatesForRunCompletion,
  deriveLifecycleUpdatesForRunStart,
  shouldActivateStructuredDelivery,
  type DeliveryActivationInput,
} from './manager'

describe('delivery manager helpers', () => {
  test('activates structured delivery for build execution and debugging work', () => {
    expect(
      shouldActivateStructuredDelivery({
        mode: 'build',
        content: 'Implement the approved plan and update the task state as you go.',
      })
    ).toBe(true)

    expect(
      shouldActivateStructuredDelivery({
        mode: 'code',
        content: 'Debug why the task status never leaves review.',
      })
    ).toBe(true)
  })

  test('does not activate structured delivery for lightweight ask mode prompts', () => {
    expect(
      shouldActivateStructuredDelivery({
        mode: 'ask',
        content: 'What does the current run panel do?',
      })
    ).toBe(false)
  })

  test('derives a minimal delivery task seed from the user request', () => {
    const seed = deriveDeliveryTaskSeed({
      mode: 'build',
      content: 'Add a Task panel for the workbench and wire it into the review surface.',
    })

    expect(seed.title).toBe('Add a Task panel for the workbench and wire it')
    expect(seed.description).toContain('Add a Task panel for the workbench')
    expect(seed.ownerRole).toBe('manager')
    expect(seed.status).toBe('in_progress')
    expect(seed.acceptanceCriteria[0]?.text).toContain('Task panel')
  })

  test('treats approved plan execution as structured delivery regardless of prompt wording', () => {
    const input: DeliveryActivationInput = {
      mode: 'build',
      content: 'Execute the approved plan.',
      approvedPlanExecution: true,
    }

    expect(shouldActivateStructuredDelivery(input)).toBe(true)
  })

  test('derives run-start lifecycle updates for an active delivery task', () => {
    const update = deriveLifecycleUpdatesForRunStart({
      activeTaskTitle: 'Implement delivery manager progression',
    })

    expect(update.phase).toBe('execute')
    expect(update.summary.activeTaskTitle).toBe('Implement delivery manager progression')
    expect(update.summary.currentPhaseSummary).toContain('Execution in progress')
    expect(update.taskStatus).toBe('in_progress')
  })

  test('derives completion lifecycle updates for successful runs', () => {
    const update = deriveLifecycleUpdatesForRunCompletion({
      outcome: 'completed',
      activeTaskTitle: 'Implement delivery manager progression',
    })

    expect(update.phase).toBe('review')
    expect(update.summary.currentPhaseSummary).toContain('awaiting review')
    expect(update.taskStatus).toBe('in_review')
  })

  test('derives completion lifecycle updates for failed runs', () => {
    const update = deriveLifecycleUpdatesForRunCompletion({
      outcome: 'failed',
      activeTaskTitle: 'Implement delivery manager progression',
    })

    expect(update.phase).toBe('execute')
    expect(update.summary.currentPhaseSummary).toContain('needs follow-up')
    expect(update.taskStatus).toBe('blocked')
  })

  test('derives qa completion updates that close the task and mark ship readiness', () => {
    const update = deriveFinalLifecycleUpdatesFromQa({
      qaDecision: 'pass',
      activeTaskTitle: 'Implement delivery closure',
    })

    expect(update.phase).toBe('ship')
    expect(update.taskStatus).toBe('done')
    expect(update.shipDecision).toBe('ready')
    expect(update.summary.currentPhaseSummary).toContain('ready to ship')
  })

  test('keeps the task in qa_pending when QA finds concerns', () => {
    const update = deriveFinalLifecycleUpdatesFromQa({
      qaDecision: 'concerns',
      activeTaskTitle: 'Implement delivery closure',
    })

    expect(update.phase).toBe('qa')
    expect(update.taskStatus).toBe('qa_pending')
    expect(update.shipDecision).toBeNull()
    expect(update.summary.currentPhaseSummary).toContain('requires QA follow-up')
  })
})
