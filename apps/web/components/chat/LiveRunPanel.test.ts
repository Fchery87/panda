import { describe, expect, test } from 'bun:test'
import path from 'node:path'

describe('LiveRunPanel', () => {
  test('persists tab open state in localStorage and supports toggle control', async () => {
    const fs = await import('node:fs')
    const componentPath = path.resolve(import.meta.dir, 'RunProgressPanel.tsx')
    const content = fs.readFileSync(componentPath, 'utf-8')

    expect(content).toContain("const STORAGE_KEY = 'panda.runProgress.isOpen'")
    expect(content).toContain('window.localStorage.getItem(STORAGE_KEY)')
    expect(content).toContain("window.localStorage.setItem(STORAGE_KEY, isOpen ? '1' : '0')")
    expect(content).toContain('onClick={() => setIsOpen((prev) => !prev)}')
    expect(content).toContain(
      'isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />'
    )
  })
})
