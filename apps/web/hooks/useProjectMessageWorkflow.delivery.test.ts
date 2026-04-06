import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('useProjectMessageWorkflow delivery wiring', () => {
  test('uses delivery manager activation and Convex delivery mutations for non-trivial work', () => {
    const source = fs.readFileSync(
      path.resolve(import.meta.dir, 'useProjectMessageWorkflow.ts'),
      'utf8'
    )

    expect(source).toContain('shouldActivateStructuredDelivery(')
    expect(source).toContain('deriveDeliveryTaskSeed(')
    expect(source).toContain('createDeliveryStateMutation')
    expect(source).toContain('createDeliveryTaskMutation')
    expect(source).toContain('updateDeliveryStateSummaryMutation')
  })
})
