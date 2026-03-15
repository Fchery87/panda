import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('shortcut registrations', () => {
  test('memoize shortcut definitions at call sites to avoid effect churn', () => {
    const commandPaletteSource = fs.readFileSync(
      path.resolve(import.meta.dir, '../components/command-palette/CommandPalette.tsx'),
      'utf8'
    )
    const sidebarSource = fs.readFileSync(path.resolve(import.meta.dir, 'useSidebar.ts'), 'utf8')
    const workbenchSource = fs.readFileSync(
      path.resolve(import.meta.dir, '../components/workbench/Workbench.tsx'),
      'utf8'
    )

    expect(commandPaletteSource).toContain('const shortcuts = useMemo(')
    expect(commandPaletteSource).toContain('useShortcuts(shortcuts)')

    expect(sidebarSource).toContain('const shortcuts = useMemo(')
    expect(sidebarSource).toContain('useShortcuts(shortcuts)')

    expect(workbenchSource).toContain('const shortcuts = useMemo(')
    expect(workbenchSource).toContain('useShortcuts(shortcuts)')
  })
})
