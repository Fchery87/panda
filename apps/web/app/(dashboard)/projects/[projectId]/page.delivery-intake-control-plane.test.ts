import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page Forge intake wiring', () => {
  test('injects Forge intake/task creation mutations into the message workflow instead of legacy delivery writers', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain('useMutation(api.forge.startIntake)')
    expect(source).toContain('useMutation(api.forge.createTasksFromPlan)')
    expect(source).toContain('useMutation(api.forge.acceptPlan)')
    expect(source).toContain('convex.query(api.forge.getProjectSnapshot, { chatId })')

    expect(source).not.toContain('useMutation(api.deliveryStates.create)')
    expect(source).not.toContain('useMutation(api.deliveryTasks.create)')
  })
})
