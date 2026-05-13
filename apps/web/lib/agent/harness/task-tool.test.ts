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
  test('exposes the new high-value subagent templates', () => {
    const names = agents.listSubagents().map((agent) => agent.name)

    expect(names).toContain('planner')
    expect(names).toContain('architect')
    expect(names).toContain('repo-scout')
    expect(names).toContain('context-curator')
    expect(names).toContain('spec-writer')
    expect(names).toContain('backend-builder')
    expect(names).toContain('database-designer')
    expect(names).toContain('refactorer')
    expect(names).toContain('docs-writer')
    expect(names).toContain('security-checker')
    expect(names).toContain('pm-orchestrator')
    expect(names).toContain('test-writer')
    expect(names).toContain('deployer')
    expect(names).toContain('observability-agent')
    expect(names).toContain('ux-copywriter')
  })

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

  test('preserves nested subagent summaries in metadata without raw prompt changes', async () => {
    const parentAgent = agents.get('build')
    expect(parentAgent).toBeDefined()

    const result = await executeTaskTool(
      {
        subagent_type: 'test-generator',
        prompt: 'write tests with private context',
        description: 'Generate tests',
      },
      {
        sessionID: 'session-parent',
        messageID: 'msg-parent',
        parentAgent: parentAgent!,
        runSubagent: async () => ({
          sessionID: 'child-session',
          output: 'ok',
          parts: [],
          subagentSummaries: [
            {
              version: 1,
              subagentId: 'nested-subagent',
              parentRunId: 'run-1',
              name: 'debugger',
              status: 'completed',
              startedAt: 1,
              completedAt: 2,
              durationMs: 1,
              capabilityPreset: 'research',
              effectiveCapabilities: ['read', 'search'],
              delegatedTaskSummary: 'Debug issue',
              outputSummary: 'Found likely cause',
              subagentChain: ['test-generator', 'debugger'],
            },
          ],
        }),
      }
    )

    expect(result.error).toBeUndefined()
    expect(result.metadata?.subagentSummaries).toEqual([
      expect.objectContaining({
        subagentId: 'nested-subagent',
        outputSummary: 'Found likely cause',
      }),
    ])
    expect(JSON.stringify(result.metadata)).not.toContain('private context')
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
