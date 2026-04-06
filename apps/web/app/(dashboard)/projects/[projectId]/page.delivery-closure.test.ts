import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page delivery closure wiring', () => {
  test('delegates delivery closure sequencing to the delivery service and still creates ship reports', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain('buildDeliveryClosureServicePlan(')
    expect(source).toContain('createShipReportMutation')
    expect(source).toContain('closurePlan.qaPendingStatus')
    expect(source).toContain('const finalLifecycle = closurePlan.finalLifecycle')
  })
})
