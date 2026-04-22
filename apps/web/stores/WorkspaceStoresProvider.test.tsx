import { act, cleanup, render } from '@testing-library/react/pure'
import { describe, expect, test } from 'bun:test'
import { JSDOM } from 'jsdom'

import { useChatSessionStore } from './chatSessionStore'
import { useEditorContextStore } from './editorContextStore'
import { WorkspaceStoresProvider } from './WorkspaceStoresProvider'
import { useWorkspaceUiStore } from './workspaceUiStore'

describe('WorkspaceStoresProvider', () => {
  test('resets all stores on projectId change', () => {
    useEditorContextStore.getState().reset()
    useChatSessionStore.getState().reset()
    useWorkspaceUiStore.getState().reset()

    const dom = new JSDOM('<!doctype html><html><body></body></html>')
    const previousWindow = globalThis.window
    const previousDocument = globalThis.document
    const previousNavigator = globalThis.navigator

    globalThis.window = dom.window as unknown as typeof globalThis.window
    globalThis.document = dom.window.document
    globalThis.navigator = dom.window.navigator
    globalThis.window.matchMedia = (() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof globalThis.window.matchMedia

    try {
      const { rerender } = render(
        <WorkspaceStoresProvider projectId={'p1' as never}>x</WorkspaceStoresProvider>
      )

      act(() => {
        useEditorContextStore.getState().openTab({ kind: 'file', path: 'a.ts' })
        useWorkspaceUiStore.getState().setRightPanelOpen(true)
        useChatSessionStore.getState().setChatMode('plan')
      })

      expect(useEditorContextStore.getState().openTabs).toHaveLength(1)

      rerender(<WorkspaceStoresProvider projectId={'p2' as never}>x</WorkspaceStoresProvider>)

      expect(useEditorContextStore.getState().openTabs).toHaveLength(0)
      expect(useChatSessionStore.getState().chatMode).toBe('plan')
      expect(useWorkspaceUiStore.getState().isRightPanelOpen).toBe(true)
    } finally {
      cleanup()
      dom.window.close()
      globalThis.window = previousWindow
      globalThis.document = previousDocument
      globalThis.navigator = previousNavigator
    }
  })
})
