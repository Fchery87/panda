import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

function readConvexFile(file: string): string {
  return fs.readFileSync(path.resolve(import.meta.dir, file), 'utf8')
}

describe('mcpServers policy gates', () => {
  test('enforces admin MCP enablement and transport ceilings for user writes', () => {
    const source = readConvexFile('mcpServers.ts')

    expect(source).toContain('async function assertMcpEnabled')
    expect(source).toContain('async function assertTransportAllowed')
    expect(source).toContain('MCP transport')
    expect(source).toContain('is disabled by admin policy')
    expect(source).toContain('await assertTransportAllowed(ctx, args.transport)')
    expect(source).toContain("source: 'user'")
  })

  test('keeps user MCP listing owner-scoped and bounded', () => {
    const source = readConvexFile('mcpServers.ts')

    expect(source).toContain("withIndex('by_user'")
    expect(source).toContain('.take(100)')
    expect(source).not.toContain('.collect()')
  })

  test('widens schema with MCP transport policy fields', () => {
    const schema = readConvexFile('schema.ts')

    expect(schema).toContain('export const MCPTransport')
    expect(schema).toContain('allowedMCPTransports: v.optional(v.array(MCPTransport))')
    expect(schema).toContain('source: v.optional(')
    expect(schema).toContain(
      "v.union(v.literal('user'), v.literal('project_recommendation'), v.literal('admin'))"
    )
  })
})
