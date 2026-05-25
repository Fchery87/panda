import { describe, expect, test } from 'bun:test'
import { executeTool, type ToolContext } from './tools'
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
    writeFiles: async () => [],
    runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 1 }),
    updateMemoryBank: async () => ({ success: true }),
    ...overrides,
  }
}

describe('ask_user tool', () => {
  test('validates and delegates structured questions to the runtime context', async () => {
    const result = await executeTool(
      makeToolCall('ask_user', {
        questions: [
          {
            id: 'direction',
            prompt: 'Which direction should Panda take?',
            recommended: 'minimal',
            options: [
              { value: 'minimal', label: 'Minimal patch' },
              { value: 'refactor', label: 'Refactor' },
            ],
          },
        ],
      }),
      createContext({
        askUser: async () => ({
          status: 'answered',
          answers: [{ questionId: 'direction', value: 'minimal', source: 'option' }],
        }),
      })
    )

    expect(result.error).toBeUndefined()
    expect(JSON.parse(result.output).status).toBe('answered')
  })

  test('fails closed for malformed questionnaires', async () => {
    const result = await executeTool(
      makeToolCall('ask_user', { questions: [{ id: 'bad', prompt: '', options: [] }] }),
      createContext()
    )

    expect(result.error).toContain('Invalid ask_user questionnaire')
  })
})
