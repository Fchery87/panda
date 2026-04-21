import { describe, expect, test } from 'bun:test'

import { useEditorContextStore } from '@/stores/editorContextStore'

import { prependEditorContextToContent } from './useAgent'

describe('useAgent editor context injection', () => {
  const resetStore = () => {
    useEditorContextStore.getState().reset()
  }

  test('prepends editor context block when active file is set', () => {
    resetStore()
    useEditorContextStore.getState().openTab({ kind: 'file', path: 'src/a.ts' })
    useEditorContextStore.getState().setSelectedFilePath('src/a.ts')

    const sentContent = prependEditorContextToContent('hello', true)

    expect(sentContent).toContain('<editor-context>')
    expect(sentContent).toContain('Active file: src/a.ts')
    expect(sentContent).toContain('hello')
  })

  test('does not prepend when includeEditorContext is false', () => {
    resetStore()
    useEditorContextStore.getState().openTab({ kind: 'file', path: 'src/a.ts' })
    useEditorContextStore.getState().setSelectedFilePath('src/a.ts')

    const sentContent = prependEditorContextToContent('hello', false)

    expect(sentContent).not.toContain('<editor-context>')
    expect(sentContent).toBe('hello')
  })

  test('omits block when no active file and no selection', () => {
    resetStore()
    const sentContent = prependEditorContextToContent('hello', true)

    expect(sentContent).not.toContain('<editor-context>')
    expect(sentContent).toBe('hello')
  })
})
