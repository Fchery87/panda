'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { EditorView } from '@codemirror/view'

interface InlineChatState {
  isOpen: boolean
  selectedText: string
  position: { top: number; left: number }
}

interface UseInlineChatOptions {
  onSubmit: (prompt: string, selectedText: string) => Promise<void>
}

export function useInlineChat({ onSubmit }: UseInlineChatOptions) {
  const [state, setState] = useState<InlineChatState>({
    isOpen: false,
    selectedText: '',
    position: { top: 0, left: 0 },
  })
  const editorViewRef = useRef<EditorView | null>(null)

  const openInlineChat = useCallback((editorView: EditorView) => {
    const selection = editorView.state.selection.main
    if (selection.from === selection.to) return

    editorViewRef.current = editorView
    const selectedText = editorView.state.doc.sliceString(selection.from, selection.to)

    const coords = editorView.coordsAtPos(selection.from)
    if (!coords) return

    setState({
      isOpen: true,
      selectedText,
      position: { top: coords.top, left: coords.left },
    })
  }, [])

  const closeInlineChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
    editorViewRef.current = null
  }, [])

  const handleSubmit = useCallback(
    async (prompt: string, selectedText: string) => {
      await onSubmit(prompt, selectedText)
      closeInlineChat()
    },
    [onSubmit, closeInlineChat]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (state.isOpen) {
          closeInlineChat()
        } else if (editorViewRef.current) {
          openInlineChat(editorViewRef.current)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [state.isOpen, openInlineChat, closeInlineChat])

  return {
    isOpen: state.isOpen,
    selectedText: state.selectedText,
    position: state.position,
    editorViewRef,
    openInlineChat,
    closeInlineChat,
    handleSubmit,
  }
}
