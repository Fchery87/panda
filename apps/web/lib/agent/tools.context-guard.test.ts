import { describe, expect, it } from 'bun:test'
import { executeTool, type ToolContext } from './tools'
import type { ToolCall } from '../llm/types'

function makeToolCall(args: Record<string, unknown>): ToolCall {
  return {
    id: 'call-run-command',
    type: 'function',
    function: {
      name: 'run_command',
      arguments: JSON.stringify(args),
    },
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

function resetContextGuardEnv(): void {
  delete process.env.PANDA_CONTEXT_GUARD_ENABLED
  delete process.env.PANDA_CONTEXT_GUARD_INDEX_OUTPUTS
}

describe('search_indexed_output tool', () => {
  it('returns focused excerpts from guarded command output evidence', async () => {
    const result = await executeTool(
      {
        id: 'call-search-indexed-output',
        type: 'function',
        function: {
          name: 'search_indexed_output',
          arguments: JSON.stringify({ sourceId: 'tool:abc:command-output', query: 'failure', limit: 2 }),
        },
      },
      createContext({
        searchIndexedOutput: async (params) => ({
          sourceType: 'run_event',
          sourceId: params.sourceId,
          query: params.query,
          excerpts: [
            {
              chunkIndex: 1,
              startLine: 10,
              endLine: 20,
              content: 'failure excerpt',
              matchedTerms: ['failure'],
              score: 1,
              truncated: true,
            },
          ],
        }),
      })
    )

    const parsed = JSON.parse(result.output)
    expect(parsed.sourceId).toBe('tool:abc:command-output')
    expect(parsed.excerpts[0].content).toBe('failure excerpt')
    expect(parsed.excerpts[0].matchedTerms).toEqual(['failure'])
    expect(parsed.excerpts[0].truncated).toBe(true)
  })
})

describe('run_command Context Guard integration', () => {
  it('preserves existing output shape when disabled', async () => {
    const result = await executeTool(
      makeToolCall({ command: 'npm test' }),
      createContext({
        runCommand: async () => ({ stdout: 'ok', stderr: '', exitCode: 0, durationMs: 1 }),
      })
    )

    const parsed = JSON.parse(result.output)
    expect(parsed).toEqual({ stdout: 'ok', stderr: '', exitCode: 0 })
  })

  it('does not index small outputs even when indexing is enabled', async () => {
    process.env.PANDA_CONTEXT_GUARD_ENABLED = '1'
    process.env.PANDA_CONTEXT_GUARD_INDEX_OUTPUTS = '1'
    let indexed = false

    try {
      const result = await executeTool(
        makeToolCall({ command: 'npm test' }),
        createContext({
          runCommand: async () => ({ stdout: 'ok', stderr: '', exitCode: 0, durationMs: 1 }),
          indexCommandOutput: async () => {
            indexed = true
            return { sourceType: 'run_event', sourceId: 'source-small', chunksWritten: 1 }
          },
        })
      )

      const parsed = JSON.parse(result.output)
      expect(parsed.contextGuard).toBeUndefined()
      expect(indexed).toBe(false)
    } finally {
      resetContextGuardEnv()
    }
  })

  it('indexes guarded outputs and returns an evidence handle', async () => {
    process.env.PANDA_CONTEXT_GUARD_ENABLED = '1'
    process.env.PANDA_CONTEXT_GUARD_INDEX_OUTPUTS = '1'
    const stdout = 'line with lots of output\n'.repeat(600)
    const indexedPayloads: Array<{
      toolCallId: string
      command: string
      cwd?: string
      stdout: string
      stderr: string
      exitCode: number
    }> = []

    try {
      const result = await executeTool(
        makeToolCall({ command: 'npm test', cwd: 'apps/web' }),
        createContext({
          runCommand: async () => ({ stdout, stderr: '', exitCode: 0, durationMs: 1 }),
          indexCommandOutput: async (args) => {
            indexedPayloads.push(args)
            return { sourceType: 'run_event', sourceId: 'tool:call-run-command:command-output', chunksWritten: 3 }
          },
        })
      )

      const parsed = JSON.parse(result.output)
      expect(indexedPayloads[0]?.stdout).toBe(stdout)
      expect(indexedPayloads[0]?.cwd).toBe('apps/web')
      expect(parsed.contextGuard.guarded).toBe(true)
      expect(parsed.contextGuard.evidence.sourceType).toBe('run_event')
      expect(parsed.contextGuard.evidence.sourceId).toBe('tool:call-run-command:command-output')
      expect(parsed.contextGuard.evidence.chunksWritten).toBe(3)
    } finally {
      resetContextGuardEnv()
    }
  })
})
