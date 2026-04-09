// apps/web/lib/lsp/client.ts
import type {
  CompletionItem,
  CompletionList,
  Diagnostic,
  Hover,
  Location,
  Position,
  TextEdit,
} from 'vscode-languageserver-protocol'

interface LSPMessage {
  jsonrpc: '2.0'
  id?: number | string
  method?: string
  params?: unknown
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

interface LSPClientOptions {
  onDiagnostics?: (uri: string, diagnostics: Diagnostic[]) => void
  onConnectionError?: (error: Error) => void
}

class LSPWebSocketUnavailableError extends Error {
  constructor() {
    super('LSP websocket transport is unavailable in this runtime')
    this.name = 'LSPWebSocketUnavailableError'
  }
}

let lspWebSocketUnavailable = false

/**
 * Language Server Protocol client
 * Manages WebSocket connection to LSP server
 */
export class LSPClient {
  private ws: WebSocket | null = null
  private messageId = 0
  private pendingRequests = new Map<number | string, (result: unknown) => void>()
  private options: LSPClientOptions
  private isConnected = false
  private documentVersions = new Map<string, number>()

  constructor(options: LSPClientOptions = {}) {
    this.options = options
  }

  /**
   * Connect to LSP WebSocket endpoint
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (lspWebSocketUnavailable) {
        reject(new LSPWebSocketUnavailableError())
        return
      }

      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/lsp`
      let opened = false

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        opened = true
        console.log('[LSP Client] Connected')
        this.isConnected = true
        this.initialize()
          .then(() => resolve())
          .catch(reject)
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data)
      }

      this.ws.onerror = (error) => {
        if (!opened) {
          lspWebSocketUnavailable = true
          const unavailableError = new LSPWebSocketUnavailableError()
          this.options.onConnectionError?.(unavailableError)
          reject(unavailableError)
          return
        }

        console.error('[LSP Client] WebSocket error:', error)
        this.options.onConnectionError?.(new Error('WebSocket error'))
        reject(error)
      }

      this.ws.onclose = () => {
        if (!opened) {
          lspWebSocketUnavailable = true
          const unavailableError = new LSPWebSocketUnavailableError()
          this.options.onConnectionError?.(unavailableError)
          reject(unavailableError)
          return
        }

        console.log('[LSP Client] Disconnected')
        this.isConnected = false
        this.pendingRequests.clear()
      }
    })
  }

  /**
   * Disconnect from LSP server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
    }
  }

  /**
   * Check if connected to LSP server
   */
  get connected(): boolean {
    return this.isConnected
  }

  /**
   * Initialize LSP connection
   */
  private async initialize(): Promise<void> {
    const result = await this.request('initialize', {
      processId: null,
      rootUri: `file://${window.location.origin}`,
      capabilities: {
        textDocument: {
          synchronization: {
            dynamicRegistration: false,
            willSave: true,
            willSaveWaitUntil: true,
            didSave: true,
          },
          completion: {
            dynamicRegistration: false,
            completionItem: {
              snippetSupport: true,
              commitCharactersSupport: true,
              documentationFormat: ['markdown', 'plaintext'],
              deprecatedSupport: true,
              preselectSupport: true,
            },
          },
          hover: {
            dynamicRegistration: false,
            contentFormat: ['markdown', 'plaintext'],
          },
          definition: {
            dynamicRegistration: false,
            linkSupport: true,
          },
          documentSymbol: {
            dynamicRegistration: false,
            hierarchicalDocumentSymbolSupport: true,
          },
          codeAction: {
            dynamicRegistration: false,
          },
          formatting: {
            dynamicRegistration: false,
          },
          rename: {
            dynamicRegistration: false,
          },
        },
        workspace: {
          workspaceFolders: false,
          configuration: false,
        },
      },
      workspaceFolders: null,
    })

    // Send initialized notification
    this.notify('initialized', {})

    console.log('[LSP Client] Initialized:', result)
  }

  /**
   * Send text document didOpen notification
   */
  didOpen(uri: string, languageId: string, version: number, text: string): void {
    this.documentVersions.set(uri, version)
    this.notify('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId,
        version,
        text,
      },
    })
  }

  /**
   * Send text document didChange notification
   */
  didChange(uri: string, contentChanges: Array<{ range?: Range; text: string }>): void {
    const currentVersion = this.documentVersions.get(uri) || 0
    const newVersion = currentVersion + 1
    this.documentVersions.set(uri, newVersion)

    this.notify('textDocument/didChange', {
      textDocument: {
        uri,
        version: newVersion,
      },
      contentChanges,
    })
  }

  /**
   * Send text document didSave notification
   */
  didSave(uri: string, text?: string): void {
    this.notify('textDocument/didSave', {
      textDocument: { uri },
      text,
    })
  }

  /**
   * Send text document didClose notification
   */
  didClose(uri: string): void {
    this.documentVersions.delete(uri)
    this.notify('textDocument/didClose', {
      textDocument: { uri },
    })
  }

  /**
   * Request completions at position
   */
  async getCompletions(
    uri: string,
    position: Position
  ): Promise<CompletionItem[] | CompletionList | null> {
    const result = await this.request('textDocument/completion', {
      textDocument: { uri },
      position,
    })
    return result as CompletionItem[] | CompletionList | null
  }

  /**
   * Request hover information at position
   */
  async getHover(uri: string, position: Position): Promise<Hover | null> {
    const result = await this.request('textDocument/hover', {
      textDocument: { uri },
      position,
    })
    return result as Hover | null
  }

  /**
   * Request definition at position
   */
  async getDefinition(uri: string, position: Position): Promise<Location | Location[] | null> {
    const result = await this.request('textDocument/definition', {
      textDocument: { uri },
      position,
    })
    return result as Location | Location[] | null
  }

  /**
   * Request document symbols
   */
  async getDocumentSymbols(uri: string): Promise<unknown[] | null> {
    const result = await this.request('textDocument/documentSymbol', {
      textDocument: { uri },
    })
    return result as unknown[] | null
  }

  /**
   * Request formatting
   */
  async formatDocument(uri: string): Promise<TextEdit[] | null> {
    const result = await this.request('textDocument/formatting', {
      textDocument: { uri },
      options: {
        tabSize: 2,
        insertSpaces: true,
      },
    })
    return result as TextEdit[] | null
  }

  /**
   * Send a request to the LSP server
   */
  private request(method: string, params: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('LSP client not connected'))
        return
      }

      const id = ++this.messageId
      const message: LSPMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      }

      this.pendingRequests.set(id, resolve)

      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`Request timeout: ${method}`))
        }
      }, 10000)

      this.ws.send(JSON.stringify(message))
    })
  }

  /**
   * Send a notification to the LSP server
   */
  private notify(method: string, params: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[LSP Client] Cannot send notification, not connected')
      return
    }

    const message: LSPMessage = {
      jsonrpc: '2.0',
      method,
      params,
    }

    this.ws.send(JSON.stringify(message))
  }

  /**
   * Handle incoming LSP message
   */
  private handleMessage(data: string): void {
    try {
      const message: LSPMessage = JSON.parse(data)

      // Handle response
      if (message.id !== undefined && message.result !== undefined) {
        const resolve = this.pendingRequests.get(message.id)
        if (resolve) {
          this.pendingRequests.delete(message.id)
          resolve(message.result)
        }
        return
      }

      // Handle error response
      if (message.id !== undefined && message.error) {
        const resolve = this.pendingRequests.get(message.id)
        if (resolve) {
          this.pendingRequests.delete(message.id)
          console.error('[LSP Client] Request error:', message.error)
          resolve(null)
        }
        return
      }

      // Handle server notification
      if (message.method) {
        this.handleNotification(message.method, message.params)
      }
    } catch (err) {
      console.error('[LSP Client] Failed to parse message:', err)
    }
  }

  /**
   * Handle server notifications
   */
  private handleNotification(method: string, params: unknown): void {
    switch (method) {
      case 'textDocument/publishDiagnostics': {
        const diagnosticParams = params as {
          uri: string
          diagnostics: Diagnostic[]
        }
        this.options.onDiagnostics?.(diagnosticParams.uri, diagnosticParams.diagnostics)
        break
      }
      default:
        console.log('[LSP Client] Unhandled notification:', method)
    }
  }
}

// Singleton instance
let globalLSPClient: LSPClient | null = null

export function getLSPClient(options?: LSPClientOptions): LSPClient {
  if (!globalLSPClient) {
    globalLSPClient = new LSPClient(options)
  }
  return globalLSPClient
}

export function resetLSPClient(): void {
  if (globalLSPClient) {
    globalLSPClient.disconnect()
    globalLSPClient = null
  }
  lspWebSocketUnavailable = false
}
