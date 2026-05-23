import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const runtimeSource = readFileSync(join(import.meta.dir, 'runtime.ts'), 'utf8')
const typesSource = readFileSync(join(import.meta.dir, 'types.ts'), 'utf8')
const agentsSource = readFileSync(join(import.meta.dir, 'agents.ts'), 'utf8')

describe('subagent fresh/fork context filtering', () => {
  test('adds defaultContextMode to harness agents and defaults children to fresh context', () => {
    expect(typesSource).toContain("defaultContextMode?: 'fresh' | 'fork'")
    expect(agentsSource).toContain('function inferDefaultContextMode')
    expect(agentsSource).toContain("return canMutate ? 'fork' : 'fresh'")
    expect(agentsSource).toContain('normalizeAgentConfig(config)')
    expect(runtimeSource).toContain('buildSubagentInitialMessages(agent: AgentConfig')
    expect(runtimeSource).toContain("if ((agent.defaultContextMode ?? 'fresh') !== 'fork') return []")
  })

  test('filters status/control/subagent artifacts out of forked child context', () => {
    for (const partType of [
      'subtask',
      'agent',
      'step_start',
      'step_finish',
      'snapshot',
      'retry',
      'compaction',
      'permission',
    ]) {
      expect(runtimeSource).toContain(`'${partType}'`)
    }
    expect(runtimeSource).toContain('parts: message.parts.filter((part) => !blockedPartTypes.has(part.type))')
    expect(runtimeSource).toContain('filter((message) => message.parts.length > 0)')
  })

  test('passes filtered fork messages into the child runtime', () => {
    expect(runtimeSource).toContain('const childInitialMessages = this.buildSubagentInitialMessages(agent, childSessionID)')
    expect(runtimeSource).toContain('childRuntime.run(childSessionID, childUserMessage, childInitialMessages)')
  })
})
