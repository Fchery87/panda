import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page ship status wiring', () => {
  test('derives ship readiness from the Forge snapshot and canonical ship decision flow', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain('forgeProjectSnapshot?.timeline')
    expect(source).toContain('recordForgeShipDecisionMutation')
    expect(source).not.toContain('api.shipReports.listByDeliveryState')
  })
})
