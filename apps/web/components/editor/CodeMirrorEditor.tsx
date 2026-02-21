'use client'

import React, { useRef, useCallback, useState, useEffect } from 'react'
import { EditorSelection, StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { useHotkeys } from 'react-hotkeys-hook'
import { InlineChat } from './InlineChat'

interface CodeMirrorEditorProps {
  filePath: string
  content: string
  jumpTo?: {
    line: number
    column: number
    nonce: number
  } | null
  onSave?: (content: string) => void
  onInlineChat?: (prompt: string, selectedText: string, filePath: string) => Promise<string | null>
}

const addJumpHighlightEffect = StateEffect.define<{ from: number; to: number }>()
const clearJumpHighlightEffect = StateEffect.define<null>()

const jumpHighlightField = StateField.define({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes)

    for (const effect of tr.effects) {
      if (effect.is(addJumpHighlightEffect)) {
        const marker = Decoration.line({
          attributes: {
            class: 'cm-jump-highlight',
          },
        })
        return Decoration.set([marker.range(effect.value.from, effect.value.to)])
      }
      if (effect.is(clearJumpHighlightEffect)) {
        return Decoration.none
      }
    }

    return decorations
  },
  provide: (f) => EditorView.decorations.from(f),
})

const jumpHighlightTheme = EditorView.theme({
  '.cm-line.cm-jump-highlight': {
    backgroundColor: 'rgba(250, 204, 21, 0.18)',
    transition: 'background-color 180ms ease-out',
  },
})

export function CodeMirrorEditor({
  filePath,
  content,
  jumpTo,
  onSave,
  onInlineChat,
}: CodeMirrorEditorProps) {
  const editorViewRef = useRef<EditorView | null>(null)
  const clearHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [inlineChatState, setInlineChatState] = useState<{
    isOpen: boolean
    selectedText: string
    position: { top: number; left: number }
  } | null>(null)

  const isTypeScript =
    filePath.endsWith('.ts') ||
    filePath.endsWith('.tsx') ||
    filePath.endsWith('.mts') ||
    filePath.endsWith('.cts')

  const handleChange = useCallback(
    (value: string) => {
      onSave?.(value)
    },
    [onSave]
  )

  const openInlineChat = useCallback(() => {
    const view = editorViewRef.current
    if (!view) return

    const selection = view.state.selection.main
    if (selection.from === selection.to) return

    const selectedText = view.state.doc.sliceString(selection.from, selection.to)
    const coords = view.coordsAtPos(selection.from)
    if (!coords) return

    setInlineChatState({
      isOpen: true,
      selectedText,
      position: { top: coords.top, left: coords.left },
    })
  }, [])

  const closeInlineChat = useCallback(() => {
    setInlineChatState(null)
  }, [])

  const handleInlineChatSubmit = useCallback(
    async (prompt: string, selectedText: string) => {
      if (!onInlineChat) return

      const result = await onInlineChat(prompt, selectedText, filePath)
      if (result !== null && editorViewRef.current) {
        const view = editorViewRef.current
        const selection = view.state.selection.main
        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: result },
        })
      }
      closeInlineChat()
    },
    [onInlineChat, filePath, closeInlineChat]
  )

  useHotkeys('mod+k', (e) => {
    e.preventDefault()
    if (inlineChatState?.isOpen) {
      closeInlineChat()
    } else {
      openInlineChat()
    }
  })

  useEffect(() => {
    if (!jumpTo) return
    const view = editorViewRef.current
    if (!view) return

    const line = Math.max(1, Math.min(jumpTo.line, view.state.doc.lines))
    const lineInfo = view.state.doc.line(line)
    const maxColumn = lineInfo.to - lineInfo.from + 1
    const column = Math.max(1, Math.min(jumpTo.column, maxColumn))
    const pos = lineInfo.from + (column - 1)

    if (clearHighlightTimerRef.current) {
      clearTimeout(clearHighlightTimerRef.current)
      clearHighlightTimerRef.current = null
    }

    view.dispatch({
      selection: EditorSelection.cursor(pos),
      scrollIntoView: true,
      effects: addJumpHighlightEffect.of({ from: lineInfo.from, to: lineInfo.to }),
    })
    view.focus()

    clearHighlightTimerRef.current = setTimeout(() => {
      view.dispatch({
        effects: clearJumpHighlightEffect.of(null),
      })
      clearHighlightTimerRef.current = null
    }, 900)
  }, [filePath, jumpTo])

  useEffect(() => {
    return () => {
      if (clearHighlightTimerRef.current) {
        clearTimeout(clearHighlightTimerRef.current)
        clearHighlightTimerRef.current = null
      }
    }
  }, [])

  return (
    <div className="h-full w-full">
      <CodeMirror
        value={content}
        height="100%"
        theme={oneDark}
        extensions={[
          jumpHighlightField,
          jumpHighlightTheme,
          javascript({
            jsx: true,
            typescript: isTypeScript,
          }),
        ]}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          highlightSelectionMatches: true,
          searchKeymap: true,
          lintKeymap: true,
        }}
        onCreateEditor={(view) => {
          editorViewRef.current = view
        }}
        onChange={handleChange}
        className="h-full text-sm"
      />
      {inlineChatState?.isOpen && onInlineChat && (
        <InlineChat
          selectedText={inlineChatState.selectedText}
          position={inlineChatState.position}
          onClose={closeInlineChat}
          onSubmit={handleInlineChatSubmit}
        />
      )}
    </div>
  )
}
