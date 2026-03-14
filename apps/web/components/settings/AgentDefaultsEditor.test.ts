import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('AgentDefaultsEditor', () => {
  test('renders browser-focused automation controls', () => {
    const componentPath = path.resolve(import.meta.dir, 'AgentDefaultsEditor.tsx')
    const content = fs.readFileSync(componentPath, 'utf-8')

    expect(content).toContain('Auto-apply file writes')
    expect(content).toContain('Auto-run allowlisted commands')
    expect(content).toContain('Allowed command prefixes (one per line)')
    expect(content).not.toContain('Tool & Command Permissions')
    expect(content).not.toContain('Bash Command Permissions')
  })
})
