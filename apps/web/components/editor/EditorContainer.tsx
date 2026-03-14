'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { useFileContent } from '@/hooks/useFileContent'

const CodeMirrorEditor = dynamic(
  () =>
    import('./CodeMirrorEditor').then((mod) => ({
      default: mod.CodeMirrorEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full space-y-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    ),
  }
)

interface EditorContainerProps {
  filePath: string
  content: string
  jumpTo?: {
    line: number
    column: number
    nonce: number
  } | null
  onSave?: (content: string) => void
  onDirtyChange?: (isDirty: boolean) => void
  onInlineChat?: (prompt: string, selectedText: string, filePath: string) => Promise<string | null>
}

export function EditorContainer({
  filePath,
  content: initialContent,
  jumpTo,
  onSave: externalOnSave,
  onDirtyChange,
  onInlineChat,
}: EditorContainerProps) {
  const { content, isDirty, updateContent } = useFileContent(initialContent, externalOnSave)

  React.useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const handleSave = React.useCallback(
    (newContent: string) => {
      updateContent(newContent)
    },
    [updateContent]
  )

  return (
    <div className="flex h-full w-full flex-col">
      <div className="surface-2 flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{filePath}</span>
          {isDirty && (
            <span className="font-mono text-xs font-medium text-primary">Unsaved changes</span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <CodeMirrorEditor
          filePath={filePath}
          content={content}
          jumpTo={jumpTo}
          onSave={handleSave}
          onInlineChat={onInlineChat}
        />
      </div>
    </div>
  )
}
