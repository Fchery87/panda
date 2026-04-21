import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('project history flow', () => {
  test('chat history action opens the persisted run history inspector', () => {
    const panelPath = path.resolve(import.meta.dir, 'ProjectChatPanel.tsx')
    const panelSource = fs.readFileSync(panelPath, 'utf8')
    const providerPath = path.resolve(import.meta.dir, 'WorkspaceRuntimeProvider.tsx')
    const providerSource = fs.readFileSync(providerPath, 'utf8')

    expect(panelSource).toContain('onClick={onOpenHistory}')
    expect(panelSource).toContain('Run History ({runHistoryCount})')

    expect(providerSource).toContain("openChatInspectorSurface('run')")
  })
})
