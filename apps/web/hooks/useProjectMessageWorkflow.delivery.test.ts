import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('useProjectMessageWorkflow delivery wiring', () => {
  test('uses delivery manager activation and Forge control-plane mutations for non-trivial work', () => {
    const source = fs.readFileSync(
      path.resolve(import.meta.dir, 'useProjectMessageWorkflow.ts'),
      'utf8'
    )

    expect(source).toContain('shouldActivateStructuredDelivery(')
    expect(source).toContain('deriveDeliveryTaskSeed(')
    expect(source).toContain('startForgeIntake')
    expect(source).toContain('createForgeTasksFromPlan')
    expect(source).toContain('acceptForgePlan')
    expect(source).not.toContain('createDeliveryStateMutation')
    expect(source).not.toContain('createDeliveryTaskMutation')
    expect(source).not.toContain('updateDeliveryStateSummaryMutation')
  })
})
