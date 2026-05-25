import { describe, expect, test } from 'bun:test'
import fs from 'fs'
import path from 'path'

describe('useAgent advisor reviewer eval runner', () => {
  test('supports named advisor-reviewer eval context', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'useAgent.ts'), 'utf8')

    expect(source).toContain('subagentName?: string')
    expect(source).toContain("scenario.subagentName === 'advisor-reviewer'")
    expect(source).toContain('Panda specialist subagent: advisor-reviewer')
    expect(source).toContain('Do not modify files')
  })
})
