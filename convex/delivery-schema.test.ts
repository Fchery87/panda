import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('delivery schema', () => {
  test('defines canonical delivery control-plane tables', () => {
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')

    expect(schemaSource).toContain('const DeliveryPhase = v.union(')
    expect(schemaSource).toContain('const DeliveryStatus = v.union(')
    expect(schemaSource).toContain('const DeliveryRole = v.union(')
    expect(schemaSource).toContain('const DeliveryTaskStatus = v.union(')
    expect(schemaSource).toContain('deliveryStates: defineTable({')
    expect(schemaSource).toContain('deliveryTasks: defineTable({')
    expect(schemaSource).toContain('reviewReports: defineTable({')
    expect(schemaSource).toContain('qaReports: defineTable({')
    expect(schemaSource).toContain('shipReports: defineTable({')
    expect(schemaSource).toContain('deliveryDecisions: defineTable({')
    expect(schemaSource).toContain('deliveryVerifications: defineTable({')
    expect(schemaSource).toContain('orchestrationWaves: defineTable({')
    expect(schemaSource).toContain('browserSessions: defineTable({')
    expect(schemaSource).toContain(
      ".index('by_delivery_updated', ['deliveryStateId', 'updatedAt'])"
    )
    expect(schemaSource).toContain(
      ".index('by_delivery_created', ['deliveryStateId', 'createdAt'])"
    )
  })
})
