/**
 * MCP (Model Context Protocol) Client
 *
 * Client for connecting to MCP servers and executing tools.
 * Supports both local (stdio) and remote (HTTP) MCP servers.
 *
 * @see https://modelcontextprotocol.io
 */

export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface MCPServerConfig {
  type: 'local' | 'remote'
  command?: string[]
  url?: string
  headers?: Record<string, string>
  enabled?: boolean
  timeout?: number
}

export interface MCPServerStatus {
  name: string
  connected: boolean
  tools: MCPTool[]
  error?: string
}

export interface MCPToolCallResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

type MCPToolsListResponse = {
  tools?: Array<{
    name?: unknown
    description?: unknown
    inputSchema?: unknown
  }>
}

export class MCPClient {
  private name: string
  private config: MCPServerConfig
  private tools: MCPTool[] = []
  private connected = false
  private error?: string

  constructor(name: string, config: MCPServerConfig) {
    this.name = name
    this.config = config
  }

  get status(): MCPServerStatus {
    return {
      name: this.name,
      connected: this.connected,
      tools: this.tools,
      error: this.error,
    }
  }

  get toolNames(): string[] {
    return this.tools.map((t) => `${this.name}_${t.name}`)
  }

  async connect(): Promise<boolean> {
    if (this.config.type === 'remote') {
      return this.connectRemote()
    }
    return this.connectLocal()
  }

  private async connectRemote(): Promise<boolean> {
    if (!this.config.url) {
      this.error = 'No URL configured for remote MCP server'
      return false
    }

    try {
      const response = await fetch(`${this.config.url}/tools/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error(`Failed to connect: ${response.statusText}`)
      }

      const data = (await response.json()) as MCPToolsListResponse
      this.tools = (data.tools || []).map((tool) => ({
        name: typeof tool.name === 'string' ? tool.name : '',
        description: typeof tool.description === 'string' ? tool.description : '',
        inputSchema:
          tool.inputSchema &&
          typeof tool.inputSchema === 'object' &&
          !Array.isArray(tool.inputSchema)
            ? (tool.inputSchema as MCPTool['inputSchema'])
            : { type: 'object', properties: {} },
      }))

      this.connected = true
      this.error = undefined
      return true
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Connection failed'
      this.connected = false
      return false
    }
  }

  private async connectLocal(): Promise<boolean> {
    this.error = 'Local MCP servers not yet supported in browser'
    this.connected = false
    return false
  }

  async callTool(toolName: string, args: Record<string, unknown>): Promise<MCPToolCallResult> {
    if (!this.connected) {
      throw new Error('MCP server not connected')
    }

    const tool = this.tools.find((t) => t.name === toolName)
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`)
    }

    if (this.config.type === 'remote') {
      return this.callRemoteTool(toolName, args)
    }

    throw new Error('Local MCP servers not yet supported')
  }

  private async callRemoteTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolCallResult> {
    if (!this.config.url) {
      throw new Error('No URL configured')
    }

    const response = await fetch(`${this.config.url}/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      body: JSON.stringify({
        name: toolName,
        arguments: args,
      }),
    })

    if (!response.ok) {
      throw new Error(`Tool call failed: ${response.statusText}`)
    }

    return response.json()
  }

  disconnect(): void {
    this.connected = false
    this.tools = []
    this.error = undefined
  }
}

export function createMCPClient(name: string, config: MCPServerConfig): MCPClient {
  return new MCPClient(name, config)
}

export function getToolFullName(serverName: string, toolName: string): string {
  return `${serverName}_${toolName}`
}

export function parseToolFullName(
  fullName: string
): { serverName: string; toolName: string } | null {
  const parts = fullName.split('_')
  if (parts.length < 2) return null
  return {
    serverName: parts[0],
    toolName: parts.slice(1).join('_'),
  }
}
