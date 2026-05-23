import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('runtime subagent mutation guard', () => {
  test('serializes multiple mutating subagents until isolation is available', () => {
    const runtimePath = path.resolve(import.meta.dir, 'runtime.ts')
    const source = fs.readFileSync(runtimePath, 'utf8')

    expect(source).toContain('isMutatingPermissionSet')
    expect(source).toContain('const readonlySubtasks = subtasksToProcess.filter')
    expect(source).toContain('const mutatingSubtasks = subtasksToProcess.filter')
    expect(source).toContain('Multiple mutating subagents were requested')
    expect(source).toContain('maxConcurrentSubagents')
    expect(source).toContain('maxConcurrentMutatingSubagents')
    expect(source).toContain('const runWithConcurrency')
    expect(source).toContain('runWithConcurrency(mutatingSubtasks, mutatingConcurrency)')
  })
})
