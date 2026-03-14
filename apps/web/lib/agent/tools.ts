/**
 * Agent Tools
 *
 * Tool definitions for the agent runtime:
 * - read_files: Read file contents
 * - list_directory: List files/directories under a path
 * - write_files: Write or modify files
 * - run_command: Run CLI commands
 * - search_code: Search code with ripgrep/fallbacks
 * - search_code_ast: Structural AST-aware search
 */

import { appLog } from '@/lib/logger'
import type { ToolDefinition, ToolCall, ToolResult } from '../llm/types'
import type { ChatMode } from './prompt-library'
import { analyzeCommand, isCommandPipelineSafe } from './command-analysis'
import { executeOracleSearch } from './harness/oracle'
import { repairJSON, safeJSONParse } from './harness/tool-repair'

type ConvexFunctionRef = unknown
type ConvexArgs = Record<string, unknown>
type ToolApiRef = unknown

function logToolError(message: string, error: unknown): void {
  appLog.error(`[agent-tools] ${message}`, error)
}

/**
 * Get tools allowed for a specific mode
 */
export function getAllowedToolsForMode(mode: ChatMode): string[] {
  const modeTools: Record<ChatMode, string[]> = {
    ask: ['search_codebase', 'search_code', 'search_code_ast', 'read_files', 'list_directory'],
    architect: [
      'search_codebase',
      'search_code',
      'search_code_ast',
      'read_files',
      'list_directory',
      'update_memory_bank',
    ],
    code: [
      'search_codebase',
      'search_code',
      'search_code_ast',
      'read_files',
      'list_directory',
      'write_files',
      'apply_patch',
      'run_command',
      'update_memory_bank',
    ],
    build: [
      'search_codebase',
      'search_code',
      'search_code_ast',
      'read_files',
      'list_directory',
      'write_files',
      'apply_patch',
      'run_command',
      'update_memory_bank',
    ],
  }
  return modeTools[mode] ?? []
}

/**
 * Filter tools based on mode
 */
export function getToolsForMode(mode: ChatMode): ToolDefinition[] {
  const allowedTools = getAllowedToolsForMode(mode)
  return AGENT_TOOLS.filter((tool) => allowedTools.includes(tool.function.name))
}

/**
 * Check if a tool is allowed for a mode
 */
export function isToolAllowedForMode(toolName: string, mode: ChatMode): boolean {
  const allowedTools = getAllowedToolsForMode(mode)
  return allowedTools.includes(toolName)
}

/**
 * Tool definitions for the agent
 */
export const AGENT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'read_files',
      description:
        'Read the contents of one or more files. Use this to understand the codebase before making changes.',
      parameters: {
        type: 'object',
        properties: {
          paths: {
            type: 'array',
            description: 'Array of file paths to read',
            items: {
              type: 'string',
              description: 'File path relative to project root',
            },
          },
        },
        required: ['paths'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description:
        'List files and subdirectories under a path. Use this to explore project structure before reading/writing files.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path relative to project root (default: root)',
          },
          recursive: {
            type: 'boolean',
            description: 'Whether to recursively include nested entries (default: false)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_files',
      description:
        "Write or modify files. Provide complete file content, not diffs. Creates files if they don't exist.",
      parameters: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'Array of files to write',
            items: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'File path relative to project root',
                },
                content: {
                  type: 'string',
                  description: 'Complete file content to write',
                },
              },
              required: ['path', 'content'],
            },
          },
        },
        required: ['files'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description:
        'Run a CLI command (tests, builds, linting, etc.). Safe read-only pipelines are allowed, while redirects and chained commands are higher risk and may require approval.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description:
              'Command to run (e.g., "npm test", "npm run lint"). Safe read-only pipes like "npm test | head -20" are allowed. Redirects and command chaining are higher risk.',
          },
          timeout: {
            type: 'number',
            description: 'Timeout in milliseconds (default: 30000)',
          },
          cwd: {
            type: 'string',
            description: 'Working directory for command (default: project root)',
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_codebase',
      description:
        'Intelligent multi-level search over the codebase. Preferred over search_code for answering high-level questions, finding architectural patterns, or locating features. Combines filename matching, symbol detection, and keyword routing.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Natural language query or specific code concept to find (e.g. "Where is authentication handled", "Timeline component")',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_code',
      description:
        'Search text across project files using ripgrep when available, with safe fallback engines.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Text or regex query to search for',
          },
          mode: {
            type: 'string',
            enum: ['literal', 'regex'],
            description: 'Search mode (default: literal)',
          },
          caseSensitive: {
            type: 'boolean',
            description: 'Whether search is case-sensitive (default: false)',
          },
          includeGlobs: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional include glob patterns',
          },
          excludeGlobs: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional exclude glob patterns',
          },
          paths: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional relative paths to search',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of matches to return',
          },
          maxMatchesPerFile: {
            type: 'number',
            description: 'Maximum matches to return per file',
          },
          contextLines: {
            type: 'number',
            description: 'Number of context lines around each match',
          },
          timeoutMs: {
            type: 'number',
            description: 'Search timeout in milliseconds',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_code_ast',
      description: 'Search code structurally using ast-grep patterns.',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'AST pattern to search for',
          },
          language: {
            type: 'string',
            description: 'Optional language override (e.g. typescript, tsx)',
          },
          paths: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional relative paths to search',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of matches to return',
          },
          timeoutMs: {
            type: 'number',
            description: 'Search timeout in milliseconds',
          },
          jsonStyle: {
            type: 'string',
            enum: ['pretty', 'stream', 'compact'],
            description: 'ast-grep JSON output style',
          },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_memory_bank',
      description:
        'Update the project-level memory bank (MEMORY_BANK.md). Use this to persist project conventions, tech stack details, or important architectural decisions that should be remembered across sessions.',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The updated contents of the memory bank in Markdown format.',
          },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apply_patch',
      description:
        'Apply a unified diff patch to a file. Use this for small edits to large files to save tokens. The patch must be in unified diff format.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path to apply the patch to',
          },
          patch: {
            type: 'string',
            description: 'Unified diff patch text to apply',
          },
        },
        required: ['path', 'patch'],
      },
    },
  },
]

/**
 * Tool handler type
 */
export type ToolHandler = (call: ToolCall) => Promise<ToolResult>

/**
 * Tool call with parsed arguments
 */
export interface ParsedToolCall extends ToolCall {
  parsedArgs: Record<string, unknown>
}

/**
 * Tool execution result with metadata
 */
export interface ToolExecutionResult extends ToolResult {
  timestamp: number
  retryCount: number
}

/**
 * Tool context passed to handlers
 */
export interface ToolContext {
  projectId: string
  chatId: string
  messageId?: string
  userId: string
  // File operations
  readFiles: (paths: string[]) => Promise<Array<{ path: string; content: string | null }>>
  // Patch operations
  applyPatch: (params: { path: string; patch: string }) => Promise<{
    success: boolean
    error?: string
    appliedHunks: number
    fuzzyMatches: number
  }>
  listDirectory?: (
    path?: string,
    recursive?: boolean
  ) => Promise<
    Array<{
      path: string
      type: 'file' | 'directory'
    }>
  >
  writeFiles: (
    files: Array<{ path: string; content: string }>
  ) => Promise<Array<{ path: string; success: boolean; error?: string }>>
  // Memory bank
  updateMemoryBank: (content: string) => Promise<{ success: boolean; error?: string }>
  // Command execution
  runCommand: (
    command: string,
    timeout?: number,
    cwd?: string
  ) => Promise<{
    stdout: string
    stderr: string
    exitCode: number
    durationMs: number
  }>
  searchCode?: (params: {
    query: string
    mode?: 'literal' | 'regex'
    caseSensitive?: boolean
    includeGlobs?: string[]
    excludeGlobs?: string[]
    paths?: string[]
    maxResults?: number
    maxMatchesPerFile?: number
    contextLines?: number
    timeoutMs?: number
    cwd?: string
  }) => Promise<{
    engine: string
    query: string
    mode: string
    truncated: boolean
    stats: {
      durationMs: number
      filesMatched: number
      matchesReturned: number
      filesScanned?: number
    }
    warnings: string[]
    matches: Array<{
      file: string
      line: number
      column: number
      snippet: string
      endLine?: number
      endColumn?: number
    }>
  }>
  searchCodeAst?: (params: {
    pattern: string
    language?: string
    paths?: string[]
    maxResults?: number
    timeoutMs?: number
    jsonStyle?: 'pretty' | 'stream' | 'compact'
    cwd?: string
  }) => Promise<{
    engine: string
    query: string
    mode: string
    truncated: boolean
    stats: {
      durationMs: number
      filesMatched: number
      matchesReturned: number
      filesScanned?: number
    }
    warnings: string[]
    matches: Array<{
      file: string
      line: number
      column: number
      snippet: string
      endLine?: number
      endColumn?: number
    }>
  }>
}

interface WriteFileSpec {
  path: string
  content: string
}

function normalizeWriteFilesInput(input: unknown): WriteFileSpec[] {
  if (Array.isArray(input)) {
    return input
      .filter(
        (item): item is { path: unknown; content: unknown } =>
          Boolean(item) && typeof item === 'object'
      )
      .map((item) => ({
        path: String(item.path ?? '').trim(),
        content: typeof item.content === 'string' ? item.content : String(item.content ?? ''),
      }))
      .filter((item) => item.path.length > 0)
  }

  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>

    if (Array.isArray(record.files)) {
      return normalizeWriteFilesInput(record.files)
    }

    if (record.file && typeof record.file === 'object') {
      return normalizeWriteFilesInput([record.file])
    }

    if ('path' in record && 'content' in record) {
      return normalizeWriteFilesInput([record])
    }
  }

  return []
}

/**
 * Convex client tool context factory
 * Creates a ToolContext that uses Convex client for actual operations
 */
export interface ConvexClient {
  query: <TResult = unknown>(query: ConvexFunctionRef, args: ConvexArgs) => Promise<TResult>
  mutation: <TResult = unknown>(mutation: ConvexFunctionRef, args: ConvexArgs) => Promise<TResult>
}

/**
 * Creates a tool context that queues artifacts for user review
 * and creates jobs for command execution
 */
export function createToolContext(
  projectId: string,
  chatId: string,
  userId: string,
  convexClient: ConvexClient,
  artifactQueue: {
    addFileArtifact: (path: string, content: string, originalContent?: string | null) => void
    addCommandArtifact: (command: string, cwd?: string) => void
  },
  api: {
    files: {
      batchGet: ToolApiRef
      list: ToolApiRef
    }
    jobs: {
      create: ToolApiRef
      updateStatus: ToolApiRef
    }
    artifacts: {
      create: ToolApiRef
    }
    memoryBank: {
      update: ToolApiRef
    }
  }
): ToolContext {
  return {
    projectId,
    chatId,
    userId,

    // Read files using Convex batchGet query
    readFiles: async (paths: string[]) => {
      try {
        const results = await convexClient.query<
          Array<{ path: string; content: string | null; exists: boolean }>
        >(api.files.batchGet, {
          projectId,
          paths,
        })

        return results.map((result: { path: string; content: string | null; exists: boolean }) => ({
          path: result.path,
          content: result.content,
        }))
      } catch (error) {
        logToolError('Failed to read files', error)
        return paths.map((path) => ({
          path,
          content: null,
        }))
      }
    },

    // Write files by queueing artifacts (don't write immediately)
    listDirectory: async (path?: string, recursive?: boolean) => {
      if (!api.files.list) {
        throw new Error('list_directory: file listing API is not configured')
      }

      const normalizedBase = (path || '').trim().replace(/^\/+|\/+$/g, '')
      const allFiles = (await convexClient.query(api.files.list, {
        projectId,
      })) as Array<{ path: string }>

      const filePaths = allFiles
        .map((file) => file.path)
        .filter((filePath) => {
          if (!normalizedBase) return true
          return filePath === normalizedBase || filePath.startsWith(`${normalizedBase}/`)
        })

      if (recursive) {
        return filePaths.map((filePath) => ({
          path: filePath,
          type: 'file' as const,
        }))
      }

      const entries = new Map<string, 'file' | 'directory'>()

      for (const filePath of filePaths) {
        const relative = normalizedBase
          ? filePath === normalizedBase
            ? ''
            : filePath.startsWith(`${normalizedBase}/`)
              ? filePath.slice(normalizedBase.length + 1)
              : filePath
          : filePath
        if (!relative) {
          entries.set(filePath, 'file')
          continue
        }

        const [head] = relative.split('/')
        if (!head) continue

        if (relative.includes('/')) {
          entries.set(head, 'directory')
        } else if (!entries.has(head)) {
          entries.set(head, 'file')
        }
      }

      return Array.from(entries.entries())
        .map(([entryPath, type]) => ({
          path: normalizedBase ? `${normalizedBase}/${entryPath}` : entryPath,
          type,
        }))
        .sort((a, b) => a.path.localeCompare(b.path))
    },

    // Write files by queueing artifacts (don't write immediately)
    writeFiles: async (files: Array<{ path: string; content: string }>) => {
      const normalizedFiles = normalizeWriteFilesInput(files)
      if (normalizedFiles.length === 0) {
        return [{ path: '', success: false, error: 'Invalid write_files payload (no files).' }]
      }

      try {
        const results: Array<{ path: string; success: boolean; error?: string }> = []
        const paths = normalizedFiles.map((f) => f.path)
        const existingByPath = new Map<string, string | null>()

        try {
          const existing = await convexClient.query<
            Array<{ path: string; content: string | null }>
          >(api.files.batchGet, {
            projectId,
            paths,
          })
          for (const row of existing) {
            existingByPath.set(row.path, row.content ?? null)
          }
        } catch (error) {
          logToolError('Failed to fetch original contents for write_files', error)
        }

        for (const file of normalizedFiles) {
          try {
            const originalContent = existingByPath.get(file.path) ?? null
            if (api.artifacts.create) {
              await convexClient.mutation(api.artifacts.create, {
                chatId,
                actions: [
                  {
                    type: 'file_write',
                    payload: {
                      filePath: file.path,
                      content: file.content,
                      originalContent,
                    },
                  },
                ],
                status: 'pending',
              })
            } else {
              // Backward-compatible local fallback.
              artifactQueue.addFileArtifact(file.path, file.content, originalContent)
            }
            results.push({ path: file.path, success: true })
          } catch (error) {
            results.push({
              path: file.path,
              success: false,
              error: error instanceof Error ? error.message : 'Failed to queue artifact',
            })
          }
        }

        return results
      } catch (error) {
        logToolError('Failed to queue file artifacts', error)
        return normalizedFiles.map((file) => ({
          path: file.path,
          success: false,
          error: error instanceof Error ? error.message : 'Failed to queue artifacts',
        }))
      }
    },

    // Run command by creating a job in Convex
    runCommand: async (command: string, timeout?: number, cwd?: string) => {
      const startTime = Date.now()

      try {
        if (api.artifacts.create) {
          await convexClient.mutation(api.artifacts.create, {
            chatId,
            actions: [
              {
                type: 'command_run',
                payload: {
                  command,
                  workingDirectory: cwd,
                },
              },
            ],
            status: 'pending',
          })
        } else {
          // Backward-compatible local fallback.
          artifactQueue.addCommandArtifact(command, cwd)
        }

        // Determine job type from command
        let jobType: 'cli' | 'build' | 'test' | 'deploy' | 'lint' | 'format' = 'cli'
        const cmdLower = command.toLowerCase()
        if (cmdLower.includes('build') || cmdLower.includes('compile')) {
          jobType = 'build'
        } else if (cmdLower.includes('test')) {
          jobType = 'test'
        } else if (cmdLower.includes('deploy')) {
          jobType = 'deploy'
        } else if (cmdLower.includes('lint')) {
          jobType = 'lint'
        } else if (cmdLower.includes('format')) {
          jobType = 'format'
        }

        // Create job in Convex
        const jobId = await convexClient.mutation(api.jobs.create, {
          projectId,
          type: jobType,
          command,
        })

        // If we cannot mutate job status, fall back to queued-only behavior.
        if (!api.jobs.updateStatus) {
          return {
            stdout: `Job created with ID: ${jobId}. Command queued for execution.`,
            stderr: '',
            exitCode: 0,
            durationMs: Date.now() - startTime,
          }
        }

        const startedAt = Date.now()
        await convexClient.mutation(api.jobs.updateStatus, {
          id: jobId,
          status: 'running',
          startedAt,
          logs: [`[${new Date(startedAt).toISOString()}] Running: ${command}`],
        })

        const response = await fetch('/api/jobs/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            command,
            workingDirectory: cwd,
            timeoutMs: timeout,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          await convexClient.mutation(api.jobs.updateStatus, {
            id: jobId,
            status: 'failed',
            completedAt: Date.now(),
            error: errorText,
            logs: [
              `[${new Date(startedAt).toISOString()}] Running: ${command}`,
              `[${new Date().toISOString()}] Failed to execute command: ${errorText}`,
            ],
          })

          return {
            stdout: '',
            stderr: errorText,
            exitCode: 1,
            durationMs: Date.now() - startTime,
          }
        }

        const payload = (await response.json()) as {
          stdout: string
          stderr: string
          exitCode: number
          durationMs: number
          timedOut: boolean
        }

        const completedAt = Date.now()
        const succeeded = payload.exitCode === 0

        await convexClient.mutation(api.jobs.updateStatus, {
          id: jobId,
          status: succeeded ? 'completed' : 'failed',
          output: payload.stdout || undefined,
          error: payload.stderr || undefined,
          completedAt,
          logs: [
            `[${new Date(startedAt).toISOString()}] Running: ${command}`,
            `[${new Date(completedAt).toISOString()}] Exit code: ${payload.exitCode}`,
            ...(payload.timedOut
              ? [`[${new Date(completedAt).toISOString()}] Command timed out`]
              : []),
          ],
        })

        // Return command result to the model for the next loop iteration.
        return {
          stdout: payload.stdout,
          stderr: payload.stderr,
          exitCode: payload.exitCode,
          durationMs: payload.durationMs,
        }
      } catch (error) {
        logToolError('Failed to create job', error)
        return {
          stdout: '',
          stderr: error instanceof Error ? error.message : 'Failed to create job',
          exitCode: 1,
          durationMs: Date.now() - startTime,
        }
      }
    },

    searchCode: async (params) => {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'text',
          query: params.query,
          mode: params.mode,
          caseSensitive: params.caseSensitive,
          includeGlobs: params.includeGlobs,
          excludeGlobs: params.excludeGlobs,
          paths: params.paths,
          maxResults: params.maxResults,
          maxMatchesPerFile: params.maxMatchesPerFile,
          contextLines: params.contextLines,
          timeoutMs: params.timeoutMs,
          workingDirectory: params.cwd,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'search_code failed')
      }

      return (await response.json()) as {
        engine: string
        query: string
        mode: string
        truncated: boolean
        stats: {
          durationMs: number
          filesMatched: number
          matchesReturned: number
          filesScanned?: number
        }
        warnings: string[]
        matches: Array<{
          file: string
          line: number
          column: number
          snippet: string
          endLine?: number
          endColumn?: number
        }>
      }
    },

    searchCodeAst: async (params) => {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'ast',
          pattern: params.pattern,
          language: params.language,
          paths: params.paths,
          maxResults: params.maxResults,
          timeoutMs: params.timeoutMs,
          jsonStyle: params.jsonStyle,
          workingDirectory: params.cwd,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'search_code_ast failed')
      }

      return (await response.json()) as {
        engine: string
        query: string
        mode: string
        truncated: boolean
        stats: {
          durationMs: number
          filesMatched: number
          matchesReturned: number
          filesScanned?: number
        }
        warnings: string[]
        matches: Array<{
          file: string
          line: number
          column: number
          snippet: string
          endLine?: number
          endColumn?: number
        }>
      }
    },

    // Update the project-level memory bank via Convex mutation
    updateMemoryBank: async (content: string) => {
      try {
        if (api.memoryBank?.update) {
          await convexClient.mutation(api.memoryBank.update, {
            projectId,
            content,
          })
          return { success: true }
        }
        return { success: false, error: 'Memory bank API not available' }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update memory bank',
        }
      }
    },

    // Apply a unified diff patch to a file
    applyPatch: async (params: { path: string; patch: string }) => {
      try {
        const { applyPatchText } = await import('./patch')

        // Read the current file content using readFiles from the closure
        const fileResults = await convexClient.query<
          Array<{ path: string; content: string | null; exists: boolean }>
        >(api.files.batchGet, {
          projectId,
          paths: [params.path],
        })

        const fileResult = fileResults[0]

        if (!fileResult || fileResult.content === null) {
          return {
            success: false,
            error: `File not found: ${params.path}`,
            appliedHunks: 0,
            fuzzyMatches: 0,
          }
        }

        // Apply the patch
        const result = applyPatchText(fileResult.content, params.patch, { fuzzyLines: 3 })

        if (result.success && result.content !== undefined) {
          // Write the patched content back as an artifact
          if (api.artifacts.create) {
            await convexClient.mutation(api.artifacts.create, {
              chatId,
              actions: [
                {
                  type: 'file_write',
                  payload: {
                    filePath: params.path,
                    content: result.content,
                    originalContent: fileResult.content,
                  },
                },
              ],
              status: 'pending',
            })
          }
        }

        return {
          success: result.success,
          error: result.error,
          appliedHunks: result.appliedHunks,
          fuzzyMatches: result.fuzzyMatches,
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to apply patch',
          appliedHunks: 0,
          fuzzyMatches: 0,
        }
      }
    },
  }
}

/**
 * Execute a tool call with the given context
 */
export async function executeTool(
  toolCall: ToolCall,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now()
  const retryCount = 0

  try {
    const args = JSON.parse(toolCall.function.arguments)
    let output = ''
    let error: string | undefined

    switch (toolCall.function.name) {
      case 'read_files': {
        const paths = args.paths as string[]
        const results = await context.readFiles(paths)
        output = JSON.stringify(results, null, 2)
        break
      }

      case 'list_directory': {
        if (!context.listDirectory) {
          throw new Error('list_directory is not available in this context')
        }
        const path = typeof args.path === 'string' ? args.path : ''
        const recursive = args.recursive === true
        const results = await context.listDirectory(path, recursive)
        output = JSON.stringify(results, null, 2)
        break
      }

      case 'write_files': {
        const files = normalizeWriteFilesInput((args as Record<string, unknown>).files ?? args)
        if (files.length === 0) {
          throw new Error(
            'Invalid write_files arguments. Expected { files: [{ path, content }] } or { file: { path, content } }.'
          )
        }
        const results = await context.writeFiles(files)
        output = JSON.stringify(results, null, 2)
        const failures = results.filter((r) => !r.success)
        if (failures.length > 0) {
          error = `Failed to write ${failures.length} file(s): ${failures.map((f) => f.path).join(', ')}`
        }
        break
      }

      case 'run_command': {
        const { command, timeout, cwd } = args
        const commandAnalysis = analyzeCommand(String(command ?? ''))
        if (commandAnalysis.kind === 'pipeline' && !isCommandPipelineSafe(commandAnalysis)) {
          return {
            toolCallId: toolCall.id,
            toolName: toolCall.function.name,
            args,
            output: '',
            error:
              'Only read-only pipelines are allowed automatically. Redirects and mutating pipelines require approval or a simpler command.',
            durationMs: 0,
            timestamp: Date.now(),
            retryCount: 0,
          }
        }
        const result = await context.runCommand(command, timeout, cwd)
        output = JSON.stringify(
          {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
          },
          null,
          2
        )
        if (result.exitCode !== 0) {
          error = `Command failed with exit code ${result.exitCode}`
        }
        break
      }

      case 'search_code': {
        if (!context.searchCode) {
          throw new Error('search_code is not available in this context')
        }
        const result = await context.searchCode({
          query: String(args.query ?? ''),
          mode: args.mode === 'regex' ? 'regex' : 'literal',
          caseSensitive: args.caseSensitive === true,
          includeGlobs: Array.isArray(args.includeGlobs)
            ? (args.includeGlobs as string[])
            : undefined,
          excludeGlobs: Array.isArray(args.excludeGlobs)
            ? (args.excludeGlobs as string[])
            : undefined,
          paths: Array.isArray(args.paths) ? (args.paths as string[]) : undefined,
          maxResults: typeof args.maxResults === 'number' ? args.maxResults : undefined,
          maxMatchesPerFile:
            typeof args.maxMatchesPerFile === 'number' ? args.maxMatchesPerFile : undefined,
          contextLines: typeof args.contextLines === 'number' ? args.contextLines : undefined,
          timeoutMs: typeof args.timeoutMs === 'number' ? args.timeoutMs : undefined,
          cwd: typeof args.cwd === 'string' ? args.cwd : undefined,
        })
        output = JSON.stringify(result, null, 2)
        break
      }

      case 'search_codebase': {
        const result = await executeOracleSearch(String(args.query ?? ''), context)
        output = JSON.stringify(result, null, 2)
        break
      }

      case 'search_codeAst': // Just marking position
        break
      case 'search_code_ast': {
        if (!context.searchCodeAst) {
          throw new Error('search_code_ast is not available in this context')
        }
        const result = await context.searchCodeAst({
          pattern: String(args.pattern ?? ''),
          language: typeof args.language === 'string' ? args.language : undefined,
          paths: Array.isArray(args.paths) ? (args.paths as string[]) : undefined,
          maxResults: typeof args.maxResults === 'number' ? args.maxResults : undefined,
          timeoutMs: typeof args.timeoutMs === 'number' ? args.timeoutMs : undefined,
          jsonStyle:
            args.jsonStyle === 'pretty' || args.jsonStyle === 'compact'
              ? args.jsonStyle
              : args.jsonStyle === 'stream'
                ? 'stream'
                : undefined,
          cwd: typeof args.cwd === 'string' ? args.cwd : undefined,
        })
        output = JSON.stringify(result, null, 2)
        break
      }

      case 'update_memory_bank': {
        const content = args.content as string
        const result = await context.updateMemoryBank(content)
        output = JSON.stringify(result, null, 2)
        if (!result.success) {
          error = result.error
        }
        break
      }

      case 'apply_patch': {
        if (!context.applyPatch) {
          throw new Error('apply_patch is not available in this context')
        }
        const result = await context.applyPatch({
          path: String(args.path ?? ''),
          patch: String(args.patch ?? ''),
        })
        output = JSON.stringify(result, null, 2)
        if (!result.success) {
          error = result.error
        }
        break
      }

      default:
        error = `Unknown tool: ${toolCall.function.name}`
    }

    return {
      toolCallId: toolCall.id,
      toolName: toolCall.function.name,
      args,
      output,
      error,
      durationMs: Date.now() - startTime,
      timestamp: startTime,
      retryCount,
    }
  } catch (err) {
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.function.name,
      args: {},
      output: '',
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startTime,
      timestamp: startTime,
      retryCount,
    }
  }
}

/**
 * Parse tool call arguments
 * Includes automatic JSON repair for malformed tool calls
 */
export function parseToolCall(toolCall: ToolCall): ParsedToolCall {
  try {
    return {
      ...toolCall,
      parsedArgs: JSON.parse(toolCall.function.arguments),
    }
  } catch (parseError) {
    // Try to repair the JSON before giving up
    void parseError
    const repairedArgs = repairJSON(toolCall.function.arguments)
    const parsedArgs = safeJSONParse<Record<string, unknown>>(repairedArgs, {})

    if (parsedArgs && Object.keys(parsedArgs).length > 0) {
      console.warn('[tools] parseToolCall: Repaired malformed tool arguments JSON')
    }

    return {
      ...toolCall,
      parsedArgs: parsedArgs ?? {},
    }
  }
}

/**
 * Format tool result for display
 */
export function formatToolResult(result: ToolResult): string {
  if (result.error) {
    return `❌ ${result.toolName} failed: ${result.error}\n\nOutput:\n${result.output}`
  }
  return `✅ ${result.toolName} completed (${result.durationMs}ms)\n\nOutput:\n${result.output}`
}

/**
 * Format tool call for display
 */
export function formatToolCall(toolCall: ToolCall): string {
  const args = JSON.parse(toolCall.function.arguments)
  return `🔧 ${toolCall.function.name}(${JSON.stringify(args, null, 2)})`
}
