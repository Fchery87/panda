'use client'

import * as React from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { mcp } from '@/lib/agent/harness'
import { Plus, Trash2, Server } from 'lucide-react'
import { toast } from 'sonner'

interface MCPServerEditorProps {
  className?: string
}

type MCPServerId = Id<'mcpServers'>

export function MCPServerEditor({ className }: MCPServerEditorProps) {
  const servers = useQuery(api.mcpServers.list)
  const addServer = useMutation(api.mcpServers.add)
  const updateServer = useMutation(api.mcpServers.update)
  const removeServer = useMutation(api.mcpServers.remove)

  const [showAddForm, setShowAddForm] = React.useState(false)
  const [testingServerId, setTestingServerId] = React.useState<MCPServerId | null>(null)
  const [testStatusByServer, setTestStatusByServer] = React.useState<
    Record<string, { ok: boolean; message: string }>
  >({})
  const [newServer, setNewServer] = React.useState({
    name: '',
    transport: 'stdio' as 'stdio' | 'sse',
    command: '',
    args: [] as string[],
    url: '',
    enabled: true,
  })

  const handleAdd = async () => {
    if (!newServer.name.trim()) return

    await addServer({
      name: newServer.name,
      transport: newServer.transport,
      command: newServer.command || undefined,
      args: newServer.args?.filter(Boolean) || undefined,
      url: newServer.url || undefined,
      enabled: newServer.enabled,
    })

    setNewServer({
      name: '',
      transport: 'stdio',
      command: '',
      args: [],
      url: '',
      enabled: true,
    })
    setShowAddForm(false)
  }

  const handleRemove = async (id: MCPServerId) => {
    await removeServer({ id })
  }

  const handleToggle = async (id: MCPServerId, enabled: boolean) => {
    await updateServer({ id, enabled: !enabled })
  }

  const handleTest = async (server: NonNullable<typeof servers>[number]) => {
    setTestingServerId(server._id)
    try {
      mcp.registerServer({
        id: String(server._id),
        name: server.name,
        transport: server.transport as 'stdio' | 'sse',
        command: server.command ?? undefined,
        args: server.args ?? undefined,
        url: server.url ?? undefined,
      })
      const result = await mcp.testConnection(String(server._id))
      const message = result.ok
        ? `Connected (${result.transport}) • ${result.toolCount ?? 0} tools • ${result.resourceCount ?? 0} resources`
        : `${result.transport}: ${result.error ?? 'connection failed'}`
      setTestStatusByServer((prev) => ({
        ...prev,
        [String(server._id)]: { ok: result.ok, message },
      }))
      if (result.ok) toast.success(message)
      else toast.error(message)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MCP test failed'
      setTestStatusByServer((prev) => ({
        ...prev,
        [String(server._id)]: { ok: false, message },
      }))
      toast.error(message)
    } finally {
      setTestingServerId(null)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-mono text-sm font-medium">MCP Servers</h4>
          <p className="text-xs text-muted-foreground">
            Model Context Protocol servers for extended tool capabilities
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-none font-mono text-xs"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Server
        </Button>
      </div>

      {showAddForm && (
        <div className="space-y-3 border border-border p-4">
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block font-mono text-xs">Name</label>
              <Input
                value={newServer.name}
                onChange={(e) => setNewServer((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="my-server"
                className="rounded-none font-mono text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs">Transport</label>
              <select
                value={newServer.transport}
                onChange={(e) =>
                  setNewServer((prev) => ({
                    ...prev,
                    transport: e.target.value as 'stdio' | 'sse',
                  }))
                }
                className="w-full rounded-none border border-border bg-background px-3 py-2 font-mono text-xs"
              >
                <option value="stdio">stdio (local process)</option>
                <option value="sse">sse (HTTP server)</option>
              </select>
            </div>

            {newServer.transport === 'stdio' ? (
              <>
                <div>
                  <label className="mb-1 block font-mono text-xs">Command</label>
                  <Input
                    value={newServer.command || ''}
                    onChange={(e) => setNewServer((prev) => ({ ...prev, command: e.target.value }))}
                    placeholder="npx -y @modelcontextprotocol/server-filesystem"
                    className="rounded-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-xs">Args (one per line)</label>
                  <textarea
                    value={newServer.args?.join('\n') || ''}
                    onChange={(e) =>
                      setNewServer((prev) => ({
                        ...prev,
                        args: e.target.value.split('\n').filter(Boolean),
                      }))
                    }
                    placeholder="/path/to/project"
                    className="min-h-[60px] w-full rounded-none border border-border bg-background px-3 py-2 font-mono text-xs"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="mb-1 block font-mono text-xs">URL</label>
                <Input
                  value={newServer.url || ''}
                  onChange={(e) => setNewServer((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="http://localhost:3000/sse"
                  className="rounded-none font-mono text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddForm(false)
                setNewServer({
                  name: '',
                  transport: 'stdio',
                  command: '',
                  args: [],
                  url: '',
                  enabled: true,
                })
              }}
              className="rounded-none font-mono text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newServer.name.trim()}
              className="rounded-none font-mono text-xs"
            >
              Add Server
            </Button>
          </div>
        </div>
      )}

      {servers && servers.length > 0 ? (
        <div className="divide-y divide-border border border-border">
          {servers.map((server) => (
            <div key={server._id} className="flex items-center gap-3 p-3">
              <Server
                className={cn(
                  'h-4 w-4 shrink-0',
                  server.enabled ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-sm">{server.name}</span>
                  <span className="font-mono text-xs uppercase text-muted-foreground">
                    {server.transport}
                  </span>
                </div>
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {server.transport === 'stdio' ? server.command : server.url}
                </div>
                {testStatusByServer[String(server._id)] ? (
                  <div
                    className={cn(
                      'mt-1 truncate font-mono text-[10px]',
                      testStatusByServer[String(server._id)]!.ok
                        ? 'text-green-700'
                        : 'text-destructive'
                    )}
                  >
                    {testStatusByServer[String(server._id)]!.message}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest(server)}
                  className="h-7 rounded-none font-mono text-xs"
                  disabled={testingServerId === server._id}
                >
                  {testingServerId === server._id ? 'Testing…' : 'Test'}
                </Button>
                <button
                  onClick={() => handleToggle(server._id, server.enabled)}
                  className={cn(
                    'rounded-none border px-2 py-1 font-mono text-xs uppercase',
                    server.enabled
                      ? 'border-green-500/50 bg-green-500/10 text-green-600'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  {server.enabled ? 'Enabled' : 'Disabled'}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(server._id)}
                  className="h-7 rounded-none text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-border p-6 text-center">
          <Server className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="font-mono text-xs text-muted-foreground">No MCP servers configured</p>
        </div>
      )}

      <div className="bg-surface-2 rounded-none border border-border p-3">
        <p className="font-mono text-xs text-muted-foreground">
          MCP servers provide additional tools for the agent. Common servers include:
        </p>
        <ul className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
          <li>
            • <code className="text-primary">@modelcontextprotocol/server-filesystem</code> - File
            system access
          </li>
          <li>
            • <code className="text-primary">@modelcontextprotocol/server-github</code> - GitHub API
          </li>
          <li>
            • <code className="text-primary">@modelcontextprotocol/server-postgres</code> -
            PostgreSQL
          </li>
        </ul>
      </div>
    </div>
  )
}
