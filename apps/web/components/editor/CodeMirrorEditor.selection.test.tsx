import { describe, expect, test } from 'bun:test'

import { useEditorContextStore } from '@/stores/editorContextStore'

import { handleSelectionUpdate } from './CodeMirrorEditor'

describe('CodeMirrorEditor selection sync', () => {
  const resetStore = () => {
    useEditorContextStore.getState().reset()
  }

  test('updates editorContextStore.selection when user selects a range', async () => {
    resetStore()
    handleSelectionUpdate('src/a.ts', {
      selectionSet: true,
      state: {
        selection: { main: { from: 6, to: 11 } },
        doc: {
          lineAt(pos: number) {
            if (pos >= 12) return { number: 3 }
            if (pos >= 6) return { number: 2 }
            return { number: 1 }
          },
          sliceString(start: number, end: number) {
            return 'line1\nline2\nline3'.slice(start, end)
          },
        },
      },
    })

    const selection = useEditorContextStore.getState().selection
    expect(selection?.filePath).toBe('src/a.ts')
    expect(selection?.startLine).toBe(2)
    expect(selection?.endLine).toBe(2)
  })
})
