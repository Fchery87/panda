import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page delivery lifecycle wiring', () => {
  test('uses manager lifecycle helpers and delivery transition mutations in run callbacks', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain('deriveLifecycleUpdatesForRunStart(')
    expect(source).toContain('deriveLifecycleUpdatesForRunCompletion(')
    expect(source).toContain('transitionDeliveryStatePhaseMutation')
    expect(source).toContain('transitionDeliveryTaskStatusMutation')
    expect(source).toContain('updateDeliveryStateSummaryMutation')
  })
})
