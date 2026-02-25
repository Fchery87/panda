/**
 * MCP (Model Context Protocol) Support
 *
 * Implements OpenCode-style MCP integration for external tool servers.
 * Allows connecting to local or remote MCP servers to extend capabilities.
 */

import type { ToolDefinition } from '../../llm/types'

/**
 * MCP server configuration
 */
export interface MCPServerConfig {
  id: string
  name: string
  transport?: 'inmemory' | 'stdio' | 'sse' | 'http'
  command?: string[] | string
  args?: string[]
  url?: string
  env?: Record<string, string>
  capabilities?: {
    tools?: boolean
    resources?: boolean
    prompts?: boolean
  }
}

/**
 * MCP tool definition (extends standard tool with MCP metadata)
 */
export interface MCPToolDefinition extends ToolDefinition {
  mcp: {
    server: string
    originalName: string
  }
}

/**
 * MCP resource definition
 */
export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

/**
 * MCP client interface
 */
export interface MCPClient {
  serverID: string
  isConnected: boolean
  listTools(): Promise<MCPToolDefinition[]>
  listResources(): Promise<MCPResource[]>
  callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ content: unknown; isError?: boolean }>
  readResource(uri: string): Promise<{ contents: unknown }>
  close(): Promise<void>
}

type MCPFetch = (input: string, init?: RequestInit) => Promise<Response>

interface StdioBridgeClient {
  listTools(): Promise<MCPToolDefinition[]>
  listResources(): Promise<MCPResource[]>
  callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ content: unknown; isError?: boolean }>
  readResource(uri: string): Promise<{ contents: unknown }>
  close(): Promise<void>
}

type StdioBridgeFactory = (config: MCPServerConfig) => Promise<StdioBridgeClient>

/**
 * In-memory MCP client implementation (for testing/stub)
 */
class InMemoryMCPClient implements MCPClient {
  serverID: string
  isConnected: boolean = true
  private tools: MCPToolDefinition[] = []
  private resources: MCPResource[] = []

  constructor(config: MCPServerConfig) {
    this.serverID = config.id
  }

  async listTools(): Promise<MCPToolDefinition[]> {
    return this.tools
  }

  async listResources(): Promise<MCPResource[]> {
    return this.resources
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ content: unknown; isError?: boolean }> {
    return {
      content: `MCP tool "${name}" called with args: ${JSON.stringify(args)}`,
    }
  }

  async readResource(uri: string): Promise<{ contents: unknown }> {
    return {
      contents: `Resource content for ${uri}`,
    }
  }

  async close(): Promise<void> {
    this.isConnected = false
  }
}

/**
 * HTTP/SSE MCP client implementation (best-effort remote transport).
 *
 * Supports common proxy shapes:
 * - GET  {baseUrl}/tools
 * - GET  {baseUrl}/resources
 * - POST {baseUrl}/tools/call
 * - POST {baseUrl}/resources/read
 */
class RemoteMCPClient implements MCPClient {
  serverID: string
  isConnected = true

  constructor(
    private config: MCPServerConfig,
    private fetchImpl: MCPFetch
  ) {
    this.serverID = config.id
  }

  private get baseUrl(): string {
    if (!this.config.url) {
      throw new Error(`MCP server "${this.serverID}" is missing a URL`)
    }
    return this.config.url.replace(/\/+$/, '')
  }

  private async getJson<T>(path: string): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${path}`)
    }
    return (await response.json()) as T
  }

  private async postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${path}`)
    }
    return (await response.json()) as T
  }

  async listTools(): Promise<MCPToolDefinition[]> {
    const payload = await this.getJson<{ tools?: MCPToolDefinition[] } | MCPToolDefinition[]>(
      '/tools'
    )
    if (Array.isArray(payload)) return payload
    return Array.isArray(payload.tools) ? payload.tools : []
  }

  async listResources(): Promise<MCPResource[]> {
    const payload = await this.getJson<{ resources?: MCPResource[] } | MCPResource[]>('/resources')
    if (Array.isArray(payload)) return payload
    return Array.isArray(payload.resources) ? payload.resources : []
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ content: unknown; isError?: boolean }> {
    const payload = await this.postJson<
      { content?: unknown; isError?: boolean; result?: unknown; error?: string } | unknown
    >('/tools/call', { name, args })

    if (
      payload &&
      typeof payload === 'object' &&
      ('content' in (payload as Record<string, unknown>) ||
        'isError' in (payload as Record<string, unknown>) ||
        'error' in (payload as Record<string, unknown>))
    ) {
      const record = payload as Record<string, unknown>
      if (typeof record.error === 'string') {
        return { content: record.error, isError: true }
      }
      return {
        content: record.content ?? record.result ?? null,
        isError: record.isError === true,
      }
    }

    return { content: payload }
  }

  async readResource(uri: string): Promise<{ contents: unknown }> {
    const payload = await this.postJson<{ contents?: unknown; content?: unknown } | unknown>(
      '/resources/read',
      { uri }
    )
    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>
      return { contents: record.contents ?? record.content ?? null }
    }
    return { contents: payload }
  }

  async close(): Promise<void> {
    this.isConnected = false
  }
}

class StdioBridgeMCPClient implements MCPClient {
  serverID: string
  isConnected = true

  constructor(
    config: MCPServerConfig,
    private bridge: StdioBridgeClient
  ) {
    this.serverID = config.id
  }

  listTools(): Promise<MCPToolDefinition[]> {
    return this.bridge.listTools()
  }

  listResources(): Promise<MCPResource[]> {
    return this.bridge.listResources()
  }

  callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ content: unknown; isError?: boolean }> {
    return this.bridge.callTool(name, args)
  }

  readResource(uri: string): Promise<{ contents: unknown }> {
    return this.bridge.readResource(uri)
  }

  async close(): Promise<void> {
    this.isConnected = false
    await this.bridge.close()
  }
}

/**
 * MCP Manager - manages connections to MCP servers
 */
class MCPManager {
  private clients: Map<string, MCPClient> = new Map()
  private configs: Map<string, MCPServerConfig> = new Map()
  private fetchImpl: MCPFetch | null
  private stdioBridgeFactory: StdioBridgeFactory | null

  constructor(options?: { fetchImpl?: MCPFetch; stdioBridgeFactory?: StdioBridgeFactory }) {
    this.fetchImpl =
      options?.fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null)
    this.stdioBridgeFactory = options?.stdioBridgeFactory ?? null
  }

  /**
   * Register an MCP server configuration
   */
  registerServer(config: MCPServerConfig): void {
    this.configs.set(config.id, config)
  }

  /**
   * Connect to an MCP server
   */
  async connect(serverID: string): Promise<MCPClient> {
    const existing = this.clients.get(serverID)
    if (existing?.isConnected) {
      return existing
    }

    const config = this.configs.get(serverID)
    if (!config) {
      throw new Error(`MCP server "${serverID}" not configured`)
    }

    const client = await this.createClient(config)
    this.clients.set(serverID, client)

    return client
  }

  private normalizeTransport(config: MCPServerConfig): 'inmemory' | 'stdio' | 'sse' | 'http' {
    if (config.transport) return config.transport
    if (config.url) return 'sse'
    if (config.command) return 'stdio'
    return 'inmemory'
  }

  private async createClient(config: MCPServerConfig): Promise<MCPClient> {
    const transport = this.normalizeTransport(config)

    if (transport === 'inmemory') {
      return new InMemoryMCPClient(config)
    }

    if (transport === 'sse' || transport === 'http') {
      if (!this.fetchImpl) {
        throw new Error('Fetch is not available for remote MCP transport')
      }
      if (!config.url) {
        throw new Error('Remote MCP transport requires a URL')
      }
      return new RemoteMCPClient(config, this.fetchImpl)
    }

    if (transport === 'stdio') {
      if (!this.stdioBridgeFactory) {
        throw new Error(
          'stdio MCP transport requires a server-side bridge factory (not available in browser runtime)'
        )
      }
      const bridge = await this.stdioBridgeFactory(config)
      return new StdioBridgeMCPClient(config, bridge)
    }

    return new InMemoryMCPClient(config)
  }

  async testConnection(serverID: string): Promise<{
    ok: boolean
    transport: string
    toolCount?: number
    resourceCount?: number
    error?: string
  }> {
    const config = this.configs.get(serverID)
    if (!config) return { ok: false, transport: 'unknown', error: 'Server not configured' }
    const transport = this.normalizeTransport(config)
    try {
      const client = await this.connect(serverID)
      const [tools, resources] = await Promise.all([client.listTools(), client.listResources()])
      return {
        ok: true,
        transport,
        toolCount: tools.length,
        resourceCount: resources.length,
      }
    } catch (error) {
      return {
        ok: false,
        transport,
        error: error instanceof Error ? error.message : 'Unknown MCP connection error',
      }
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverID: string): Promise<void> {
    const client = this.clients.get(serverID)
    if (client) {
      await client.close()
      this.clients.delete(serverID)
    }
  }

  /**
   * Get all tools from all connected MCP servers
   */
  async getAllTools(): Promise<MCPToolDefinition[]> {
    const allTools: MCPToolDefinition[] = []

    for (const client of this.clients.values()) {
      if (client.isConnected) {
        const tools = await client.listTools()
        allTools.push(...tools)
      }
    }

    return allTools
  }

  /**
   * Get all resources from all connected MCP servers
   */
  async getAllResources(): Promise<MCPResource[]> {
    const allResources: MCPResource[] = []

    for (const client of this.clients.values()) {
      if (client.isConnected) {
        const resources = await client.listResources()
        allResources.push(...resources)
      }
    }

    return allResources
  }

  /**
   * Execute a tool on an MCP server
   */
  async executeTool(
    serverID: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ output: string; error?: string }> {
    const client = this.clients.get(serverID)

    if (!client || !client.isConnected) {
      try {
        await this.connect(serverID)
      } catch (error) {
        return {
          output: '',
          error: `Failed to connect to MCP server "${serverID}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    }

    const connectedClient = this.clients.get(serverID)
    if (!connectedClient) {
      return {
        output: '',
        error: `MCP server "${serverID}" not connected`,
      }
    }

    try {
      const result = await connectedClient.callTool(toolName, args)

      if (result.isError) {
        return {
          output: '',
          error:
            typeof result.content === 'string' ? result.content : JSON.stringify(result.content),
        }
      }

      return {
        output:
          typeof result.content === 'string'
            ? result.content
            : JSON.stringify(result.content, null, 2),
      }
    } catch (error) {
      return {
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error executing MCP tool',
      }
    }
  }

  /**
   * Read a resource from an MCP server
   */
  async readResource(serverID: string, uri: string): Promise<{ content: unknown; error?: string }> {
    const client = this.clients.get(serverID)

    if (!client || !client.isConnected) {
      return {
        content: null,
        error: `MCP server "${serverID}" not connected`,
      }
    }

    try {
      const result = await client.readResource(uri)
      return { content: result.contents }
    } catch (error) {
      return {
        content: null,
        error: error instanceof Error ? error.message : 'Unknown error reading MCP resource',
      }
    }
  }

  /**
   * List all configured servers
   */
  listServers(): MCPServerConfig[] {
    return Array.from(this.configs.values())
  }

  /**
   * List all connected servers
   */
  listConnected(): string[] {
    return Array.from(this.clients.entries())
      .filter(([_, client]) => client.isConnected)
      .map(([id]) => id)
  }

  getServerStatus(serverID: string): {
    configured: boolean
    connected: boolean
    transport?: string
  } {
    const config = this.configs.get(serverID)
    return {
      configured: !!config,
      connected: this.clients.get(serverID)?.isConnected === true,
      transport: config ? this.normalizeTransport(config) : undefined,
    }
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    for (const [id] of this.clients) {
      await this.disconnect(id)
    }
  }
}
export const mcp = new MCPManager()
export { MCPManager }
