import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('project history flow', () => {
  test('chat history action opens the persisted run history inspector', () => {
    const panelPath = path.resolve(import.meta.dir, 'ProjectChatPanel.tsx')
    const panelSource = fs.readFileSync(panelPath, 'utf8')
    const pagePath = path.resolve(
      import.meta.dir,
      '../../app/(dashboard)/projects/[projectId]/page.tsx'
    )
    const pageSource = fs.readFileSync(pagePath, 'utf8')

    expect(panelSource).toContain('onOpenHistory: () => void')
    expect(panelSource).toContain('onClick={onOpenHistory}')
    expect(panelSource).toContain('Run History ({runHistoryCount})')

    expect(pageSource).toContain('onOpenHistory={() => {')
    expect(pageSource).toContain("openChatInspectorSurface('run')")
    expect(pageSource).toContain('renderInspectorInline={false}')
  })
})
