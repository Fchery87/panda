import { describe, expect, test } from 'bun:test'

import { useEditorContextStore } from './editorContextStore'

describe('editorContextStore', () => {
  const resetStore = () => {
    useEditorContextStore.getState().reset()
  }

  test('opens a tab and sets it as active', () => {
    resetStore()
    useEditorContextStore.getState().openTab({ kind: 'file', path: 'src/a.ts' })

    const state = useEditorContextStore.getState()
    expect(state.openTabs).toEqual([{ kind: 'file', path: 'src/a.ts' }])
    expect(state.selectedFilePath).toBe('src/a.ts')
  })

  test('opening an already-open tab does not duplicate it', () => {
    resetStore()
    const state = useEditorContextStore.getState()

    state.openTab({ kind: 'file', path: 'src/a.ts' })
    state.openTab({ kind: 'file', path: 'src/a.ts' })

    expect(useEditorContextStore.getState().openTabs).toHaveLength(1)
  })

  test('closing the active tab selects the previous tab', () => {
    resetStore()
    const state = useEditorContextStore.getState()

    state.openTab({ kind: 'file', path: 'src/a.ts' })
    state.openTab({ kind: 'file', path: 'src/b.ts' })
    state.closeTab('src/b.ts')

    const next = useEditorContextStore.getState()
    expect(next.openTabs.map((tab) => tab.path)).toEqual(['src/a.ts'])
    expect(next.selectedFilePath).toBe('src/a.ts')
  })

  test('selection updates and persists across cursor moves', () => {
    resetStore()
    const state = useEditorContextStore.getState()

    state.setSelection({ filePath: 'src/a.ts', startLine: 10, endLine: 20 })
    state.setCursorPosition({ line: 15, column: 4 })

    const next = useEditorContextStore.getState()
    expect(next.selection?.startLine).toBe(10)
    expect(next.cursorPosition?.line).toBe(15)
  })

  test('clearing the active file clears selection but keeps tabs', () => {
    resetStore()
    const state = useEditorContextStore.getState()

    state.openTab({ kind: 'file', path: 'src/a.ts' })
    state.setSelection({ filePath: 'src/a.ts', startLine: 1, endLine: 5 })
    state.setSelectedFilePath(null)

    const next = useEditorContextStore.getState()
    expect(next.selection).toBeNull()
    expect(next.openTabs).toHaveLength(1)
  })
})
