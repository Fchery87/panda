'use client'

import React from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

interface CodeMirrorEditorProps {
  filePath: string
  content: string
  onSave?: (content: string) => void
}

export function CodeMirrorEditor({ filePath, content, onSave }: CodeMirrorEditorProps) {
  const isTypeScript =
    filePath.endsWith('.ts') ||
    filePath.endsWith('.tsx') ||
    filePath.endsWith('.mts') ||
    filePath.endsWith('.cts')

  const handleChange = React.useCallback(
    (value: string) => {
      onSave?.(value)
    },
    [onSave]
  )

  return (
    <div className="h-full w-full">
      <CodeMirror
        value={content}
        height="100%"
        theme={oneDark}
        extensions={[
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
        onChange={handleChange}
        className="h-full text-sm"
      />
    </div>
  )
}
