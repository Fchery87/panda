import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page delivery orchestrator wiring', () => {
  test('uses the centralized delivery closure service and keeps QA fingerprint helpers out of ad hoc page assembly', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain('buildDeliveryClosureServicePlan(')
    expect(source).toContain('deriveQaReportFingerprint(')
    expect(source).toContain('closurePlan.shouldRunBrowserQa')
  })
})
