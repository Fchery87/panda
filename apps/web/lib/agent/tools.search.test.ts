import { describe, expect, it } from 'bun:test'
import { AGENT_TOOLS, executeTool, type ToolContext } from './tools'
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
    applyPatch: async () => ({ success: true, appliedHunks: 1, fuzzyMatches: 0 }),
    writeFiles: async () => [],
    runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 1 }),
    updateMemoryBank: async () => ({ success: true }),
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

describe('project file materialization tool execution', () => {
  it('normalizes leading slash file paths before writing persistent project files', async () => {
    const writtenPaths: string[] = []
    const context: ToolContext = {
      ...createBaseContext(),
      writeFiles: async (files) => {
        writtenPaths.push(...files.map((file) => file.path))
        return files.map((file) => ({ path: file.path, success: true }))
      },
    }

    const result = await executeTool(
      makeToolCall('write_files', {
        files: [{ path: '/docs/index.md', content: '# Docs\n' }],
      }),
      context
    )

    expect(result.error).toBeUndefined()
    expect(writtenPaths).toEqual(['docs/index.md'])
    expect(result.output).toContain('pending_review')
    expect(result.output).toContain('must be applied to persist to the project file tree')
    expect(result.output).toContain('docs/index.md')
    expect(result.output).not.toContain('/docs/index.md')
  })

  it('explains placeholder files used to represent empty folders', async () => {
    const context: ToolContext = {
      ...createBaseContext(),
      writeFiles: async (files) => files.map((file) => ({ path: file.path, success: true })),
    }

    const result = await executeTool(
      makeToolCall('write_files', {
        files: [{ path: 'docs/.gitkeep', content: '' }],
      }),
      context
    )

    expect(result.error).toBeUndefined()
    expect(result.output).toContain('folderPlaceholderNote')
    expect(result.output).toContain('represent empty folder')
    expect(result.output).toContain('docs')
  })

  it('normalizes explicit directory write intents to durable .gitkeep placeholders', async () => {
    const writtenPaths: string[] = []
    const context: ToolContext = {
      ...createBaseContext(),
      writeFiles: async (files) => {
        writtenPaths.push(...files.map((file) => file.path))
        return files.map((file) => ({ path: file.path, success: true }))
      },
    }

    const result = await executeTool(
      makeToolCall('write_files', {
        files: [
          { path: 'docs/', type: 'directory' },
          { path: '/notes', kind: 'folder' },
        ],
      }),
      context
    )

    expect(result.error).toBeUndefined()
    expect(writtenPaths).toEqual(['docs/.gitkeep', 'notes/.gitkeep'])
    expect(result.output).toContain('folderPlaceholderNote')
    expect(result.output).toContain('docs')
    expect(result.output).toContain('notes')
  })

  it('rejects filesystem-write commands because they do not update the project file tree', async () => {
    let commandRan = false
    const context: ToolContext = {
      ...createBaseContext(),
      runCommand: async () => {
        commandRan = true
        return { stdout: '', stderr: '', exitCode: 0, durationMs: 1 }
      },
    }

    const result = await executeTool(
      makeToolCall('run_command', { command: 'mkdir docs' }),
      context
    )

    expect(commandRan).toBe(false)
    expect(result.error).toContain('Use write_files')
    expect(result.error).toContain('project file tree')
  })

  it('tells agents how to represent requested empty folders durably', () => {
    const writeFilesTool = AGENT_TOOLS.find((tool) => tool.function.name === 'write_files')

    expect(writeFilesTool?.function.description).toContain('placeholder file')
    expect(JSON.stringify(writeFilesTool?.function.parameters)).toContain('nested placeholder file')
  })
})
