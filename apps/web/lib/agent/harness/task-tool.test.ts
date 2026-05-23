import { describe, expect, test } from 'bun:test'
import type { AgentConfig, SubagentResult } from './types'
import { agents } from './agents'
import { checkPermission } from './permissions'
import { createTaskToolDefinition, executeTaskTool } from './task-tool'

function createSubagentResult(): SubagentResult {
  return {
    sessionID: 'child-session',
    output: 'ok',
    parts: [],
  }
}

describe('task tool schema', () => {
  test('does not schema-block custom subagent names with a static enum', () => {
    const definition = createTaskToolDefinition()
    const subagentType = definition.function.parameters.properties.subagent_type as {
      type: string
      enum?: string[]
      description?: string
    }

    expect(subagentType.type).toBe('string')
    expect(subagentType.enum).toBeUndefined()
    expect(subagentType.description).toContain('user-created custom subagents')
    expect(definition.function.description).toContain('Available subagent types:')
  })

  test('includes custom registered subagents in the dynamic tool description', () => {
    agents.register({
      name: 'design-reviewer-custom',
      description: 'Reviews UI consistency from a custom Convex subagent.',
      mode: 'subagent',
      hidden: false,
      permission: {
        read_files: 'allow',
        search_code: 'allow',
        write_files: 'deny',
        run_command: 'deny',
      },
      prompt: 'Review UI consistency.',
    })

    try {
      const definition = createTaskToolDefinition()
      expect(definition.function.description).toContain('design-reviewer-custom')
      expect(definition.function.description).toContain('Reviews UI consistency')
    } finally {
      agents.unregister('design-reviewer-custom')
    }
  })
})

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

  test('delegates to a registered custom subagent by runtime name', async () => {
    let delegatedAgent: AgentConfig | undefined
    const parentAgent = agents.get('build')
    expect(parentAgent).toBeDefined()

    agents.register({
      name: 'design-reviewer-custom',
      description: 'Reviews UI consistency from a custom Convex subagent.',
      mode: 'subagent',
      hidden: false,
      permission: {
        read_files: 'allow',
        search_code: 'allow',
        write_files: 'deny',
        run_command: 'deny',
      },
      prompt: 'Review UI consistency.',
    })

    try {
      const result = await executeTaskTool(
        {
          subagent_type: 'design-reviewer-custom',
          prompt: 'review the settings page layout',
          description: 'Review UI',
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
      expect(result.metadata?.agent).toBe('design-reviewer-custom')
      expect(delegatedAgent?.name).toBe('design-reviewer-custom')
      expect(checkPermission(delegatedAgent!.permission, 'write_files')).toBe('deny')
      expect(checkPermission(delegatedAgent!.permission, 'read_files')).toBe('allow')
    } finally {
      agents.unregister('design-reviewer-custom')
    }
  })
})
