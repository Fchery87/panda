// apps/web/components/editor/lsp-completion.ts
import {
  autocompletion,
  CompletionContext,
  CompletionResult,
  Completion,
} from '@codemirror/autocomplete'
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'
import type {
  CompletionItem,
  CompletionList,
  InsertTextFormat,
} from 'vscode-languageserver-protocol'
import { LSPClient } from '@/lib/lsp/client'

interface LSPCompletionOptions {
  client: LSPClient | null
  filePath: string
  enabled?: boolean
}

/**
 * Convert LSP CompletionItem to CodeMirror Completion
 */
function lspCompletionToCodeMirror(item: CompletionItem): Completion {
  const completion: Completion = {
    label: item.label,
    type: lspKindToCodeMirrorType(item.kind),
    detail: item.detail,
    info: item.documentation
      ? typeof item.documentation === 'string'
        ? item.documentation
        : item.documentation.value
      : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cross-version EditorView type incompatibility
    apply: (item.textEdit
      ? (view: EditorView, _completion: Completion, from: number, to: number) => {
          if (item.textEdit && 'range' in item.textEdit) {
            view.dispatch({
              changes: {
                from: item.textEdit.range.start.character,
                to: item.textEdit.range.end.character,
                insert: item.textEdit.newText,
              },
            })
          } else {
            view.dispatch({
              changes: { from, to, insert: item.insertText || item.label },
            })
          }
        }
      : item.insertText || item.label) as any,
  }

  return completion
}

/**
 * Map LSP CompletionItemKind to CodeMirror type
 */
function lspKindToCodeMirrorType(kind?: number): string | undefined {
  const kindMap: Record<number, string> = {
    1: 'text', // Text
    2: 'method', // Method
    3: 'function', // Function
    4: 'constructor', // Constructor
    5: 'field', // Field
    6: 'variable', // Variable
    7: 'class', // Class
    8: 'interface', // Interface
    9: 'module', // Module
    10: 'property', // Property
    11: 'unit', // Unit
    12: 'value', // Value
    13: 'enum', // Enum
    14: 'keyword', // Keyword
    15: 'snippet', // Snippet
    16: 'color', // Color
    17: 'file', // File
    18: 'reference', // Reference
    19: 'folder', // Folder
    20: 'enumMember', // EnumMember
    21: 'constant', // Constant
    22: 'struct', // Struct
    23: 'event', // Event
    24: 'operator', // Operator
    25: 'type', // TypeParameter
  }

  return kind ? kindMap[kind] : undefined
}

/**
 * Create LSP completion source for CodeMirror
 */
function createLSPCompletionSource(client: LSPClient, filePath: string) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    if (!client.connected) return null

    const pos = context.pos
    const line = context.state.doc.lineAt(pos)
    const lineNumber = line.number - 1 // LSP uses 0-indexed lines
    const character = pos - line.from

    try {
      const result = await client.getCompletions(`file://${filePath}`, {
        line: lineNumber,
        character,
      })

      if (!result) return null

      let items: CompletionItem[]
      if (Array.isArray(result)) {
        items = result
      } else {
        items = result.items
      }

      if (items.length === 0) return null

      // Calculate the start position for replacement
      // This handles cases where we want to replace partial word
      const word = context.matchBefore(/\w*/)
      const from = word ? word.from : pos

      const options = items.map(lspCompletionToCodeMirror)

      return {
        from,
        options,
        filter: false, // Let LSP handle filtering
      }
    } catch (err) {
      console.error('[LSP Completion] Error:', err)
      return null
    }
  }
}

/**
 * CodeMirror extension for LSP-powered completions
 */
export function lspCompletion({ client, filePath, enabled = true }: LSPCompletionOptions) {
  if (!enabled || !client) return []

  // Create completion source
  const completionSource = createLSPCompletionSource(client, filePath)

  // Create view plugin to sync document changes with LSP
  const syncPlugin = ViewPlugin.fromClass(
    class {
      constructor(view: EditorView) {
        // Initial sync happens in useLSP hook
      }

      update(update: ViewUpdate) {
        if (!client.connected) return

        // Only sync if document actually changed
        if (update.docChanged) {
          const content = update.state.doc.toString()
          client.didChange(`file://${filePath}`, [{ text: content }])
        }
      }

      destroy() {
        // Cleanup handled by useLSP hook
      }
    }
  )

  return [
    syncPlugin,
    // Autocompletion extension with LSP source
    autocompletion({
      override: [completionSource],
      defaultKeymap: true,
      closeOnBlur: true,
      maxRenderedOptions: 50,
      optionClass: (option: Completion) => {
        return `cm-completionItem-${option.type || 'unknown'}`
      },
    }),
  ]
}
