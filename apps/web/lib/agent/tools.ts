/**
 * Agent Tools
 * 
 * Tool definitions for the agent runtime:
 * - read_files: Read file contents
 * - write_files: Write or modify files
 * - run_command: Run CLI commands
 */

import type { ToolDefinition, ToolCall, ToolResult } from '../llm/types';

/**
 * Tool definitions for the agent
 */
export const AGENT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'read_files',
      description: 'Read the contents of one or more files. Use this to understand the codebase before making changes.',
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
      description: 'Write or modify files. Provide complete file content, not diffs. Creates files if they don\'t exist.',
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
      description: 'Run a CLI command (tests, builds, linting, etc.). Use to verify changes work correctly.',
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
];

/**
 * Tool handler type
 */
export type ToolHandler = (call: ToolCall) => Promise<ToolResult>;

/**
 * Tool call with parsed arguments
 */
export interface ParsedToolCall extends ToolCall {
  parsedArgs: Record<string, unknown>;
}

/**
 * Tool execution result with metadata
 */
export interface ToolExecutionResult extends ToolResult {
  timestamp: number;
  retryCount: number;
}

/**
 * Tool context passed to handlers
 */
export interface ToolContext {
  projectId: string;
  chatId: string;
  messageId?: string;
  userId: string;
  // File operations
  readFiles: (paths: string[]) => Promise<Array<{ path: string; content: string | null }>>;
  writeFiles: (files: Array<{ path: string; content: string }>) => Promise<Array<{ path: string; success: boolean; error?: string }>>;
  // Command execution
  runCommand: (command: string, timeout?: number, cwd?: string) => Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
  }>;
}

/**
 * Execute a tool call with the given context
 */
export async function executeTool(
  toolCall: ToolCall,
  context: ToolContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  let retryCount = 0;

  try {
    const args = JSON.parse(toolCall.function.arguments);
    let output = '';
    let error: string | undefined;

    switch (toolCall.function.name) {
      case 'read_files': {
        const paths = args.paths as string[];
        const results = await context.readFiles(paths);
        output = JSON.stringify(results, null, 2);
        break;
      }

      case 'write_files': {
        const files = args.files as Array<{ path: string; content: string }>;
        const results = await context.writeFiles(files);
        output = JSON.stringify(results, null, 2);
        const failures = results.filter((r) => !r.success);
        if (failures.length > 0) {
          error = `Failed to write ${failures.length} file(s): ${failures.map((f) => f.path).join(', ')}`;
        }
        break;
      }

      case 'run_command': {
        const { command, timeout, cwd } = args;
        const result = await context.runCommand(command, timeout, cwd);
        output = JSON.stringify(
          {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
          },
          null,
          2
        );
        if (result.exitCode !== 0) {
          error = `Command failed with exit code ${result.exitCode}`;
        }
        break;
      }

      default:
        error = `Unknown tool: ${toolCall.function.name}`;
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
    };
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
    };
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
    };
  } catch {
    return {
      ...toolCall,
      parsedArgs: {},
    };
  }
}

/**
 * Format tool result for display
 */
export function formatToolResult(result: ToolResult): string {
  if (result.error) {
    return `❌ ${result.toolName} failed: ${result.error}\n\nOutput:\n${result.output}`;
  }
  return `✅ ${result.toolName} completed (${result.durationMs}ms)\n\nOutput:\n${result.output}`;
}

/**
 * Format tool call for display
 */
export function formatToolCall(toolCall: ToolCall): string {
  const args = JSON.parse(toolCall.function.arguments);
  return `🔧 ${toolCall.function.name}(${JSON.stringify(args, null, 2)})`;
}
