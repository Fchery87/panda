import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page review artifact visibility wiring', () => {
  test('queries review reports for the active task and uses the task panel view-model helper', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain('api.reviewReports.listByTask')
    expect(source).toContain('buildTaskPanelViewModel({')
    expect(source).toContain('task={taskPanelViewModel}')
  })
})
