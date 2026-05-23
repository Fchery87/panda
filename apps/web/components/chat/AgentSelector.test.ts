import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = readFileSync(join(import.meta.dir, 'AgentSelector.tsx'), 'utf8')

describe('AgentSelector mode picker boundaries', () => {
  test('keeps the main mode selector focused on primary parent modes, not subagent discovery', () => {
    expect(source).toContain('Primary modes')
    expect(source).toContain('Agent autonomy')
    expect(source).toContain('Mode routing')

    expect(source).not.toContain('agents.listSubagents')
    expect(source).not.toContain('Subagents (use @mention)')
    expect(source).not.toContain('@{agent.name}')
  })
})
