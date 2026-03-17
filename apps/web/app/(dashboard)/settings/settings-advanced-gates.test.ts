import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('settings advanced policy gates', () => {
  it('hides MCP and subagent editors when admin policy disables them', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain('adminDefaults?.allowUserMCP !== false')
    expect(source).toContain('adminDefaults?.allowUserSubagents !== false')
    expect(source).toContain('MCP access is disabled by your admin')
    expect(source).toContain('Custom subagents are disabled by your admin')
  })
})
