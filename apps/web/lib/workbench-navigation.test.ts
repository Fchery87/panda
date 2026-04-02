import { describe, expect, test } from 'bun:test'
import { buildInlineChatFailureDisplay, resolveExplorerRevealTarget } from './workbench-navigation'

describe('workbench navigation helpers', () => {
  test('resolves the first file under a breadcrumb folder', () => {
    const target = resolveExplorerRevealTarget({
      folderPath: 'src/components',
      files: [
        { path: 'src/app.tsx' },
        { path: 'src/components/button.tsx' },
        { path: 'src/components/card.tsx' },
      ],
    })

    expect(target).toBe('src/components/button.tsx')
  })

  test('returns null when a breadcrumb folder has no matching files', () => {
    const target = resolveExplorerRevealTarget({
      folderPath: 'src/components',
      files: [{ path: 'src/app.tsx' }],
    })

    expect(target).toBeNull()
  })

  test('formats inline chat failures for user-facing recovery', () => {
    const display = buildInlineChatFailureDisplay(new Error('Model request failed'))

    expect(display.title).toBe('Inline chat failed')
    expect(display.description).toContain('Model request failed')
  })

  test('formats unknown inline chat failures without leaking raw types', () => {
    const display = buildInlineChatFailureDisplay('boom')

    expect(display.title).toBe('Inline chat failed')
    expect(display.description).toContain('boom')
  })
})
