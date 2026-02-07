import { describe, expect, test } from 'bun:test'

describe('LiveRunPanel', () => {
  test('persists tab open state in localStorage and supports toggle control', async () => {
    const fs = await import('node:fs')
    const content = fs.readFileSync('./apps/web/components/chat/LiveRunPanel.tsx', 'utf-8')

    expect(content).toContain("const LIVE_RUN_OPEN_STORAGE_KEY = 'panda.liveRun.isOpen'")
    expect(content).toContain('window.localStorage.getItem(LIVE_RUN_OPEN_STORAGE_KEY)')
    expect(content).toContain(
      'window.localStorage.setItem(LIVE_RUN_OPEN_STORAGE_KEY, isOpen ? \'1\' : \'0\')'
    )
    expect(content).toContain('onClick={() => setIsOpen((prev) => !prev)}')
    expect(content).toContain(
      'isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />'
    )
  })
})
