import { describe, expect, test } from 'bun:test'
import { executeTool, type ToolContext } from './tools'
import type { AdvisorPolicy } from './workflow'
import type { ToolCall } from '../llm/types'

function makeToolCall(name: string, args: Record<string, unknown>): ToolCall {
  return {
    id: `call-${name}`,
    type: 'function',
    function: { name, arguments: JSON.stringify(args) },
  }
}

function createContext(overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    projectId: 'project_1',
    chatId: 'chat_1',
    userId: 'user_1',
    readFiles: async () => [],
    applyPatch: async () => ({ success: true, appliedHunks: 1, fuzzyMatches: 0 }),
    writeFiles: async () => [{ path: 'package.json', success: true }],
    runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 1 }),
    updateMemoryBank: async () => ({ success: true }),
    ...overrides,
  }
}

const advisorPolicy: AdvisorPolicy = {
  enabled: true,
  requiredFor: ['dependency_change', 'destructive_command'],
  reasoningEffort: 'high' as const,
}

describe('direct tool advisor enforcement', () => {
  test('blocks dependency file writes before write_files executes', async () => {
    let writeCalled = false
    let reviewRequested = false
    const result = await executeTool(
      makeToolCall('write_files', { files: [{ path: 'package.json', content: '{}' }] }),
      createContext({
        advisorPolicy,
        writeFiles: async () => {
          writeCalled = true
          return [{ path: 'package.json', success: true }]
        },
        requestAdvisorReview: async ({ gates }) => {
          reviewRequested = true
          expect(gates).toContain('dependency_change')
          return { requestId: 'review_1' }
        },
      })
    )

    expect(writeCalled).toBe(false)
    expect(reviewRequested).toBe(true)
    expect(result.error).toContain('Advisor review required')
    expect(JSON.parse(result.output).status).toBe('needs_advisor')
  })

  test('blocks destructive commands before run_command executes', async () => {
    let commandCalled = false
    const result = await executeTool(
      makeToolCall('run_command', { command: 'rm -rf node_modules' }),
      createContext({
        advisorPolicy,
        runCommand: async () => {
          commandCalled = true
          return { stdout: '', stderr: '', exitCode: 0, durationMs: 1 }
        },
        requestAdvisorReview: async ({ gates }) => {
          expect(gates).toContain('destructive_command')
          return { requestId: 'review_1' }
        },
      })
    )

    expect(commandCalled).toBe(false)
    expect(result.error).toContain('Advisor review required')
  })
})
