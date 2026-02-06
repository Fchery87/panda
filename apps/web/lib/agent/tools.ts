/**
 * Agent Tools
 *
 * Tool definitions for the agent runtime:
 * - read_files: Read file contents
 * - write_files: Write or modify files
 * - run_command: Run CLI commands
 */

import type { ToolDefinition, ToolCall, ToolResult } from '../llm/types'

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
        'Run a CLI command (tests, builds, linting, etc.). Use to verify changes work correctly.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Command to run (e.g., "npm test", "npm run lint")',
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
  writeFiles: (
    files: Array<{ path: string; content: string }>
  ) => Promise<Array<{ path: string; success: boolean; error?: string }>>
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
}

/**
 * Convex client tool context factory
 * Creates a ToolContext that uses Convex client for actual operations
 */
export interface ConvexClient {
  query: (query: any, args: any) => Promise<any>
  mutation: (mutation: any, args: any) => Promise<any>
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
      batchGet: any
    }
    jobs: {
      create: any
      updateStatus: any
    }
    artifacts: {
      create: any
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
        const results = await convexClient.query(api.files.batchGet, {
          projectId,
          paths,
        })

        return results.map((result: { path: string; content: string | null; exists: boolean }) => ({
          path: result.path,
          content: result.content,
        }))
      } catch (error) {
        console.error('Failed to read files:', error)
        return paths.map((path) => ({
          path,
          content: null,
        }))
      }
    },

    // Write files by queueing artifacts (don't write immediately)
    writeFiles: async (files: Array<{ path: string; content: string }>) => {
      try {
        const results: Array<{ path: string; success: boolean; error?: string }> = []
        const paths = files.map((f) => f.path)
        const existingByPath = new Map<string, string | null>()

        try {
          const existing = await convexClient.query(api.files.batchGet, {
            projectId,
            paths,
          })
          for (const row of existing as Array<{ path: string; content: string | null }>) {
            existingByPath.set(row.path, row.content ?? null)
          }
        } catch (error) {
          console.error('Failed to fetch original contents for write_files:', error)
        }

        for (const file of files) {
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
        console.error('Failed to queue file artifacts:', error)
        return files.map((file) => ({
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
        console.error('Failed to create job:', error)
        return {
          stdout: '',
          stderr: error instanceof Error ? error.message : 'Failed to create job',
          exitCode: 1,
          durationMs: Date.now() - startTime,
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

      case 'write_files': {
        const files = args.files as Array<{ path: string; content: string }>
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
 */
export function parseToolCall(toolCall: ToolCall): ParsedToolCall {
  try {
    return {
      ...toolCall,
      parsedArgs: JSON.parse(toolCall.function.arguments),
    }
  } catch {
    return {
      ...toolCall,
      parsedArgs: {},
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
