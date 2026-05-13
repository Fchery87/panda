import { describe, expect, test } from 'bun:test'
import { MCPManager } from './mcp'

describe('harness MCP manager', () => {
  test('connects to remote MCP transport and lists tools/resources via HTTP endpoints', async () => {
    const fetchImpl = async (input: string, init?: RequestInit) => {
      const url = String(input)
      const path = url.replace('https://mcp.example.com', '')
      const method = init?.method ?? 'GET'

      const json = (body: unknown) =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })

      if (method === 'GET' && path === '/tools') {
        return json({
          tools: [
            {
              type: 'function',
              function: { name: 'remote_tool', description: 'x', parameters: { type: 'object' } },
              mcp: { server: 'srv1', originalName: 'remote_tool' },
            },
          ],
        })
      }
      if (method === 'GET' && path === '/resources') {
        return json({ resources: [{ uri: 'mcp://r1', name: 'res1' }] })
      }
      if (method === 'POST' && path === '/tools/call') {
        return json({ content: 'ok' })
      }
      if (method === 'POST' && path === '/resources/read') {
        return json({ contents: 'content' })
      }
      return new Response('not found', { status: 404 })
    }

    const manager = new MCPManager({ fetchImpl })
    manager.registerServer({
      id: 'srv1',
      name: 'Remote',
      transport: 'sse',
      url: 'https://mcp.example.com',
    })

    const result = await manager.testConnection('srv1')
    expect(result.ok).toBe(true)
    expect(result.toolCount).toBe(1)
    expect(result.resourceCount).toBe(1)

    const toolExec = await manager.executeTool('srv1', 'remote_tool', { x: 1 })
    expect(toolExec.error).toBeUndefined()
    expect(toolExec.output).toContain('ok')
    expect(toolExec.metadata).toEqual({ serverID: 'srv1', source: 'user', transport: 'sse' })
  })

  test('denies transports disabled by MCP policy before connection', async () => {
    const auditEntries: unknown[] = []
    const manager = new MCPManager({
      policy: { allowedTransports: ['sse', 'http'] },
      onPermissionAudit: (entry) => {
        auditEntries.push(entry)
      },
    })
    manager.registerServer({
      id: 'stdio-denied',
      name: 'Local denied',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'fake-mcp'],
    })

    const result = await manager.testConnection('stdio-denied')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('disabled by admin policy')
    expect(auditEntries).toEqual([
      expect.objectContaining({
        serverID: 'stdio-denied',
        serverSource: 'user',
        transport: 'stdio',
        decision: 'deny',
        target: { kind: 'summary', value: 'user:stdio:stdio-denied' },
      }),
    ])
  })

  test('does not activate project recommendation MCP servers automatically', async () => {
    const manager = new MCPManager()
    manager.registerServer({
      id: 'project-rec',
      name: 'Project recommendation',
      transport: 'sse',
      source: 'project_recommendation',
      url: 'https://mcp.example.com',
    })

    const result = await manager.executeTool('project-rec', 'remote_tool', { secret: 'hidden' })
    expect(result.output).toBe('')
    expect(result.error).toContain('Project MCP recommendations cannot activate tools')
    expect(manager.listConnected()).toEqual([])
  })

  test('emits redacted MCP permission audit entries for tool calls', async () => {
    const auditEntries: unknown[] = []
    const manager = new MCPManager({
      onPermissionAudit: (entry) => {
        auditEntries.push(entry)
      },
    })
    manager.registerServer({ id: 'mem1', name: 'Memory', transport: 'inmemory', source: 'admin' })

    const result = await manager.executeTool('mem1', 'lookup_secret', { token: 'raw-token' })
    expect(result.error).toBeUndefined()
    expect(auditEntries).toEqual([
      expect.objectContaining({
        serverID: 'mem1',
        serverSource: 'admin',
        transport: 'inmemory',
        toolName: 'lookup_secret',
        decision: 'allow',
        target: { kind: 'summary', value: 'admin:inmemory:mem1:lookup_secret' },
      }),
    ])
    expect(JSON.stringify(auditEntries)).not.toContain('raw-token')
  })

  test('returns clear error for stdio transport without bridge factory', async () => {
    const manager = new MCPManager()
    manager.registerServer({
      id: 'stdio1',
      name: 'Local',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'fake-mcp'],
    })

    const result = await manager.testConnection('stdio1')
    expect(result.ok).toBe(false)
    expect(result.error?.toLowerCase()).toContain('bridge')
  })
})
