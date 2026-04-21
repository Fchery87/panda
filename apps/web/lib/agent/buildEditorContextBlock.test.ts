import { describe, expect, test } from 'bun:test'

import { buildEditorContextBlock } from './buildEditorContextBlock'

describe('buildEditorContextBlock', () => {
  test('returns null when there is no active file and no selection', () => {
    expect(
      buildEditorContextBlock({
        activeFile: null,
        selection: null,
        openTabs: [],
      })
    ).toBeNull()
  })

  test('formats active file only', () => {
    const out = buildEditorContextBlock({
      activeFile: 'src/a.ts',
      selection: null,
      openTabs: [{ kind: 'file', path: 'src/a.ts' }],
    })

    expect(out).toContain('Active file: src/a.ts')
    expect(out).not.toContain('Selection')
  })

  test('formats active file with selection', () => {
    const out = buildEditorContextBlock({
      activeFile: 'src/a.ts',
      selection: {
        filePath: 'src/a.ts',
        startLine: 10,
        endLine: 20,
        text: 'foo',
      },
      openTabs: [{ kind: 'file', path: 'src/a.ts' }],
    })

    expect(out).toContain('Selection: src/a.ts:10-20')
    expect(out).toContain('foo')
  })

  test('lists other open tabs separately', () => {
    const out = buildEditorContextBlock({
      activeFile: 'src/a.ts',
      selection: null,
      openTabs: [
        { kind: 'file', path: 'src/a.ts' },
        { kind: 'file', path: 'src/b.ts' },
      ],
    })

    expect(out).toContain('Other open tabs: src/b.ts')
  })

  test('truncates selection text over 1000 chars', () => {
    const longText = 'x'.repeat(2000)
    const out = buildEditorContextBlock({
      activeFile: 'a.ts',
      selection: {
        filePath: 'a.ts',
        startLine: 1,
        endLine: 100,
        text: longText,
      },
      openTabs: [],
    })

    expect(out!.length).toBeLessThan(1500)
    expect(out).toContain('[truncated]')
  })
})
