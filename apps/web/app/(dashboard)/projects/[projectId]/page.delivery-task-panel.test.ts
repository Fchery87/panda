import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page delivery task panel wiring', () => {
  test('queries delivery state and delivery tasks and mounts TaskPanel into ReviewPanel', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain('api.deliveryStates.getActiveByChat')
    expect(source).toContain('api.deliveryTasks.listByDeliveryState')
    expect(source).toContain('taskContent={')
    expect(source).toContain('<TaskPanel')
  })
})
