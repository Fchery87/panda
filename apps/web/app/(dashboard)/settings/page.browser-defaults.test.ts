import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('SettingsPage browser defaults', () => {
  test('wires agent defaults editor instead of legacy permissions editor', () => {
    const pagePath = path.resolve(import.meta.dir, 'page.tsx')
    const content = fs.readFileSync(pagePath, 'utf-8')

    expect(content).toContain(
      "import { AgentDefaultsEditor } from '@/components/settings/AgentDefaultsEditor'"
    )
    expect(content).not.toContain(
      "import { PermissionsEditor } from '@/components/settings/PermissionsEditor'"
    )
    expect(content).toContain('<AgentDefaultsEditor')
    expect(content).not.toContain('<PermissionsEditor')
    expect(content).toContain('agentDefaults')
    expect(content).not.toContain('permissions,')
  })
})
