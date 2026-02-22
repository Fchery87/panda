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
  command?: string[]
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
 * MCP Manager - manages connections to MCP servers
 */
class MCPManager {
  private clients: Map<string, MCPClient> = new Map()
  private configs: Map<string, MCPServerConfig> = new Map()

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

    const client = new InMemoryMCPClient(config)
    this.clients.set(serverID, client)

    return client
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
