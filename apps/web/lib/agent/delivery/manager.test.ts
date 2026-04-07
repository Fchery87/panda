import { describe, expect, test } from 'bun:test'
import {
  deriveDeliveryTaskSeed,
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
})
