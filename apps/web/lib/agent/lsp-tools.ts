// apps/web/lib/agent/lsp-tools.ts
/**
 * LSP Tools for Agentic Harness
 *
 * These tools provide semantic code intelligence via Language Server Protocol:
 * - get_type_info: Get type information at cursor position
 * - find_references: Find all references to a symbol
 * - go_to_definition: Navigate to symbol definition
 * - get_document_symbols: Get all symbols in a document
 * - get_diagnostics: Get type errors and warnings
 */

import type { ToolDefinition, ToolCall, ToolResult } from '../llm/types'
import type { ChatMode } from './prompt-library'
import type { LSPClient } from '../lsp/client'

/**
 * LSP Tool definitions for the agent
 */
export const LSP_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_type_info',
      description:
        'Get type information and documentation for a symbol at a specific position in the code. Use this to understand the types of variables, functions, and APIs.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file containing the symbol',
          },
          line: {
            type: 'number',
            description: 'Line number (0-indexed) where the symbol is located',
          },
          character: {
            type: 'number',
            description: 'Character position (0-indexed) in the line',
          },
        },
        required: ['filePath', 'line', 'character'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_references',
      description:
        'Find all references to a symbol across the codebase. Use this to understand where a function, variable, or type is used.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file containing the symbol',
          },
          line: {
            type: 'number',
            description: 'Line number (0-indexed) where the symbol is located',
          },
          character: {
            type: 'number',
            description: 'Character position (0-indexed) in the line',
          },
        },
        required: ['filePath', 'line', 'character'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'go_to_definition',
      description:
        'Navigate to the definition of a symbol. Use this to jump to where a function, variable, or type is defined.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file containing the symbol',
          },
          line: {
            type: 'number',
            description: 'Line number (0-indexed) where the symbol is located',
          },
          character: {
            type: 'number',
            description: 'Character position (0-indexed) in the line',
          },
        },
        required: ['filePath', 'line', 'character'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_document_symbols',
      description:
        'Get all symbols (functions, classes, interfaces, variables) defined in a file. Use this to understand the structure of a file.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file to analyze',
          },
        },
        required: ['filePath'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_diagnostics',
      description:
        'Get type errors, warnings, and other diagnostics for a file. Use this to identify bugs and type issues.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file to check',
          },
        },
        required: ['filePath'],
      },
    },
  },
]

/**
 * Get LSP tools allowed for a specific mode
 */
export function getAllowedLSPToolsForMode(mode: ChatMode): string[] {
  const modeTools: Record<ChatMode, string[]> = {
    ask: [
      'get_type_info',
      'find_references',
      'go_to_definition',
      'get_document_symbols',
      'get_diagnostics',
    ],
    plan: [
      'get_type_info',
      'find_references',
      'go_to_definition',
      'get_document_symbols',
      'get_diagnostics',
    ],
    code: [
      'get_type_info',
      'find_references',
      'go_to_definition',
      'get_document_symbols',
      'get_diagnostics',
    ],
    build: [
      'get_type_info',
      'find_references',
      'go_to_definition',
      'get_document_symbols',
      'get_diagnostics',
    ],
  }
  return modeTools[mode] ?? []
}

/**
 * Filter LSP tools based on mode
 */
export function getLSPToolsForMode(mode: ChatMode): ToolDefinition[] {
  const allowedTools = getAllowedLSPToolsForMode(mode)
  return LSP_TOOLS.filter((tool) => allowedTools.includes(tool.function.name))
}

/**
 * Context for LSP tool execution
 */
export interface LSPToolContext {
  getLSPClient: () => LSPClient | null
  readFile: (path: string) => Promise<string | null>
}

/**
 * Execute an LSP tool call
 */
export async function executeLSPTool(
  toolCall: ToolCall,
  context: LSPToolContext
): Promise<ToolResult> {
  const startTime = Date.now()
  const client = context.getLSPClient()

  if (!client) {
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.function.name,
      args: {},
      output: '',
      error: 'LSP client not available',
      durationMs: Date.now() - startTime,
    }
  }

  try {
    const args = JSON.parse(toolCall.function.arguments)
    let output = ''
    let error: string | undefined

    switch (toolCall.function.name) {
      case 'get_type_info': {
        const { filePath, line, character } = args
        const content = await context.readFile(filePath)

        if (content === null) {
          error = `File not found: ${filePath}`
          break
        }

        // Open document in LSP
        const uri = `file://${filePath}`
        client.didOpen(uri, 'typescript', 1, content)

        // Get hover information
        const hover = await client.getHover(uri, { line, character })

        if (hover) {
          const contents = Array.isArray(hover.contents)
            ? hover.contents.map((c) => (typeof c === 'string' ? c : c.value)).join('\n')
            : typeof hover.contents === 'string'
              ? hover.contents
              : hover.contents.value

          output = JSON.stringify(
            {
              type: contents.split('\n')[0] || 'unknown',
              documentation: contents,
              range: hover.range,
            },
            null,
            2
          )
        } else {
          output = JSON.stringify({ info: 'No type information available' }, null, 2)
        }

        // Close document
        client.didClose(uri)
        break
      }

      case 'find_references': {
        const { filePath, line, character } = args
        const content = await context.readFile(filePath)

        if (content === null) {
          error = `File not found: ${filePath}`
          break
        }

        const uri = `file://${filePath}`
        client.didOpen(uri, 'typescript', 1, content)

        // Note: TypeScript LSP doesn't have a direct findReferences in the basic protocol
        // This would need to be implemented or we return a placeholder
        output = JSON.stringify(
          {
            message: 'Find references requires additional LSP capabilities not yet implemented',
            filePath,
            line,
            character,
          },
          null,
          2
        )

        client.didClose(uri)
        break
      }

      case 'go_to_definition': {
        const { filePath, line, character } = args
        const content = await context.readFile(filePath)

        if (content === null) {
          error = `File not found: ${filePath}`
          break
        }

        const uri = `file://${filePath}`
        client.didOpen(uri, 'typescript', 1, content)

        const definition = await client.getDefinition(uri, { line, character })

        if (definition) {
          const locations = Array.isArray(definition) ? definition : [definition]
          output = JSON.stringify(
            {
              locations: locations.map((loc) => ({
                filePath: loc.uri.replace('file://', ''),
                range: loc.range,
              })),
            },
            null,
            2
          )
        } else {
          output = JSON.stringify({ message: 'No definition found' }, null, 2)
        }

        client.didClose(uri)
        break
      }

      case 'get_document_symbols': {
        const { filePath } = args
        const content = await context.readFile(filePath)

        if (content === null) {
          error = `File not found: ${filePath}`
          break
        }

        const uri = `file://${filePath}`
        client.didOpen(uri, 'typescript', 1, content)

        const symbols = await client.getDocumentSymbols(uri)

        if (symbols) {
          output = JSON.stringify({ symbols }, null, 2)
        } else {
          output = JSON.stringify({ symbols: [] }, null, 2)
        }

        client.didClose(uri)
        break
      }

      case 'get_diagnostics': {
        const { filePath } = args
        const content = await context.readFile(filePath)

        if (content === null) {
          error = `File not found: ${filePath}`
          break
        }

        const uri = `file://${filePath}`
        client.didOpen(uri, 'typescript', 1, content)

        // Wait a moment for diagnostics to be computed
        await new Promise((resolve) => setTimeout(resolve, 500))

        // This would require storing diagnostics from the publishDiagnostics notification
        // For now, return a placeholder
        output = JSON.stringify(
          {
            message: 'Diagnostics are published asynchronously via LSP notifications',
            filePath,
          },
          null,
          2
        )

        client.didClose(uri)
        break
      }

      default:
        error = `Unknown LSP tool: ${toolCall.function.name}`
    }

    return {
      toolCallId: toolCall.id,
      toolName: toolCall.function.name,
      args,
      output,
      error,
      durationMs: Date.now() - startTime,
    }
  } catch (err) {
    return {
      toolCallId: toolCall.id,
      toolName: toolCall.function.name,
      args: {},
      output: '',
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startTime,
    }
  }
}
