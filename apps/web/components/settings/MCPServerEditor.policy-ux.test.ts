import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('MCP server policy UX', () => {
  test('explains transport risks, connection states, and permission boundaries', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'MCPServerEditor.tsx'), 'utf8')

    expect(source).toContain('Transport Risk')
    expect(source).toContain('stdio starts a local process')
    expect(source).toContain('SSE connects to a')
    expect(source).toContain('remote HTTP endpoint')
    expect(source).toContain('Permission Boundary')
    expect(source).toContain('Do not add secrets')
    expect(source).toContain('Test before enabling')
    expect(source).toContain("'Testing…'")
  })
})
