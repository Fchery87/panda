import { describe, expect, test } from 'bun:test'
import type { AgentConfig, SubagentResult } from './types'
import { agents } from './agents'
import { checkPermission } from './permissions'
import { executeTaskTool } from './task-tool'

function createSubagentResult(): SubagentResult {
  return {
    sessionID: 'child-session',
    output: 'ok',
    parts: [],
  }
}

describe('executeTaskTool', () => {
  test('intersects delegated permissions with a read-only parent agent', async () => {
    let delegatedAgent: AgentConfig | undefined

    const parentAgent = agents.get('plan')
    expect(parentAgent).toBeDefined()

    const result = await executeTaskTool(
      {
        subagent_type: 'test-generator',
        prompt: 'write tests',
        description: 'Generate tests',
      },
      {
        sessionID: 'session-parent',
        messageID: 'msg-parent',
        parentAgent: parentAgent!,
        runSubagent: async (agent) => {
          delegatedAgent = agent
          return createSubagentResult()
        },
      }
    )

    expect(result.error).toBeUndefined()
    expect(delegatedAgent).toBeDefined()
    expect(checkPermission(delegatedAgent!.permission, 'write_files')).toBe('deny')
    expect(checkPermission(delegatedAgent!.permission, 'run_command')).toBe('ask')
  })

  test('preserves child allowed tools when parent allows them', async () => {
    let delegatedAgent: AgentConfig | undefined

    const parentAgent = agents.get('build')
    const childTemplate = agents.get('test-generator')
    expect(parentAgent).toBeDefined()
    expect(childTemplate).toBeDefined()

    const result = await executeTaskTool(
      {
        subagent_type: 'test-generator',
        prompt: 'write tests',
        description: 'Generate tests',
      },
      {
        sessionID: 'session-parent',
        messageID: 'msg-parent',
        parentAgent: parentAgent!,
        runSubagent: async (agent) => {
          delegatedAgent = agent
          return createSubagentResult()
        },
      }
    )

    expect(result.error).toBeUndefined()
    expect(delegatedAgent).toBeDefined()
    expect(delegatedAgent).not.toBe(childTemplate)
    expect(delegatedAgent!.permission).not.toBe(childTemplate!.permission)
    expect(checkPermission(delegatedAgent!.permission, 'write_files')).toBe('allow')
    expect(checkPermission(delegatedAgent!.permission, 'run_command')).toBe('allow')
  })
})
