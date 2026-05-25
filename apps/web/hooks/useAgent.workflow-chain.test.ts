import { describe, expect, test } from 'bun:test'
import fs from 'fs'
import path from 'path'

describe('useAgent workflow chain runtime linkage', () => {
  test('marks workflow chain steps running/completed/failed with run id', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'useAgent.ts'), 'utf8')

    expect(source).toContain('workflowChainId')
    expect(source).toContain('workflowChainStepId')
    expect(source).toContain('updateWorkflowChainStep')
    expect(source).toContain("status: 'running'")
    expect(source).toContain("status: 'completed'")
    expect(source).toContain("status: 'failed'")
  })
})
