/**
 * MCP Server Registry
 *
 * Manages connections to multiple MCP servers and provides
 * a unified interface for tool discovery and execution.
 */

import { MCPClient, type MCPServerConfig, type MCPServerStatus, type MCPTool } from './client'

export interface MCPRegistryConfig {
  [serverName: string]: MCPServerConfig
}

export class MCPRegistry {
  private clients: Map<string, MCPClient> = new Map()

  async register(name: string, config: MCPServerConfig): Promise<MCPServerStatus> {
    const existing = this.clients.get(name)
    if (existing) {
      existing.disconnect()
    }

    const client = new MCPClient(name, config)
    this.clients.set(name, client)

    if (config.enabled !== false) {
      await client.connect()
    }

    return client.status
  }

  unregister(name: string): boolean {
    const client = this.clients.get(name)
    if (!client) return false

    client.disconnect()
    this.clients.delete(name)
    return true
  }

  getClient(name: string): MCPClient | undefined {
    return this.clients.get(name)
  }

  listServers(): MCPServerStatus[] {
    return Array.from(this.clients.values()).map((c) => c.status)
  }

  listAllTools(): Array<{ serverName: string; tool: MCPTool }> {
    const tools: Array<{ serverName: string; tool: MCPTool }> = []

    for (const [serverName, client] of this.clients) {
      const status = client.status
      if (status.connected) {
        for (const tool of status.tools) {
          tools.push({ serverName, tool })
        }
      }
    }

    return tools
  }

  async connectAll(): Promise<MCPServerStatus[]> {
    const results: MCPServerStatus[] = []

    for (const client of this.clients.values()) {
      await client.connect()
      results.push(client.status)
    }

    return results
  }

  disconnectAll(): void {
    for (const client of this.clients.values()) {
      client.disconnect()
    }
  }

  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const client = this.clients.get(serverName)
    if (!client) {
      throw new Error(`MCP server not found: ${serverName}`)
    }

    return client.callTool(toolName, args)
  }

  getToolDescription(fullToolName: string): string | undefined {
    const parts = fullToolName.split('_')
    if (parts.length < 2) return undefined

    const serverName = parts[0]
    const toolName = parts.slice(1).join('_')

    const client = this.clients.get(serverName)
    if (!client) return undefined

    const status = client.status
    const tool = status.tools.find((t) => t.name === toolName)
    return tool?.description
  }
}

let globalRegistry: MCPRegistry | null = null

export function getMCPRegistry(): MCPRegistry {
  if (!globalRegistry) {
    globalRegistry = new MCPRegistry()
  }
  return globalRegistry
}

export function resetMCPRegistry(): void {
  if (globalRegistry) {
    globalRegistry.disconnectAll()
    globalRegistry = null
  }
}

export async function initializeMCPServers(config: MCPRegistryConfig): Promise<MCPServerStatus[]> {
  const registry = getMCPRegistry()
  const results: MCPServerStatus[] = []

  for (const [name, serverConfig] of Object.entries(config)) {
    const status = await registry.register(name, serverConfig)
    results.push(status)
  }

  return results
}
