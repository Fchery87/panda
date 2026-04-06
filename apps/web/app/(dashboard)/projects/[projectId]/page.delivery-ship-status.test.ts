import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page ship status wiring', () => {
  test('queries ship reports and feeds ship readiness through the extracted closure lifecycle path', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain('api.shipReports.listByDeliveryState')
    expect(source).toContain('createShipReportMutation')
    expect(source).toContain('const finalLifecycle = closurePlan.finalLifecycle')
  })
})
