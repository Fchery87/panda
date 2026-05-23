import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('agent runtime custom subagents wiring', () => {
  test('registers resolved custom subagents before harness execution', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'runtime.ts'), 'utf8')

    expect(source).toContain('harnessCustomSubagents?: CustomSubagentRecord[]')
    expect(source).toContain('resolveSubagentRegistry')
    expect(source).toContain("agent.source === 'custom'")
    expect(source).toContain('harnessAgents.register(subagent)')
  })
})
