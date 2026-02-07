import { describe, expect, it } from 'bun:test'
import { executeTool, type ToolContext } from './tools'
import type { ToolCall } from '../llm/types'

function makeToolCall(name: string, args: Record<string, unknown>): ToolCall {
  return {
    id: `call-${name}`,
    type: 'function',
    function: {
      name,
      arguments: JSON.stringify(args),
    },
  }
}

function createBaseContext(): ToolContext {
  return {
    projectId: 'project_1',
    chatId: 'chat_1',
    userId: 'user_1',
    readFiles: async () => [],
    writeFiles: async () => [],
    runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 1 }),
  }
}

describe('search tool execution', () => {
  it('executes search_code with tool context handler', async () => {
    const context: ToolContext = {
      ...createBaseContext(),
      searchCode: async () => ({
        engine: 'ripgrep',
        query: 'needle',
        mode: 'literal',
        truncated: false,
        stats: {
          durationMs: 2,
          filesMatched: 1,
          matchesReturned: 1,
        },
        warnings: [],
        matches: [
          {
            file: 'src/index.ts',
            line: 10,
            column: 5,
            snippet: 'needle',
          },
        ],
      }),
    }

    const result = await executeTool(makeToolCall('search_code', { query: 'needle' }), context)

    expect(result.error).toBeUndefined()
    expect(result.output).toContain('ripgrep')
    expect(result.output).toContain('src/index.ts')
  })

  it('returns error when search_code_ast is unavailable', async () => {
    const result = await executeTool(
      makeToolCall('search_code_ast', { pattern: 'console.log($X)' }),
      createBaseContext()
    )

    expect(result.error).toContain('not available')
  })
})
