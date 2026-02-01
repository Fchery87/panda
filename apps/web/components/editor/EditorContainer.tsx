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
  onSave?: (content: string) => void
}

export function EditorContainer({
  filePath,
  content: initialContent,
  onSave: externalOnSave,
}: EditorContainerProps) {
  const { content, isDirty, updateContent } = useFileContent(initialContent, externalOnSave)

  const handleSave = React.useCallback(
    (newContent: string) => {
      updateContent(newContent)
    },
    [updateContent]
  )

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">{filePath}</span>
          {isDirty && <span className="text-xs font-medium text-amber-500">Unsaved changes</span>}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <CodeMirrorEditor filePath={filePath} content={content} onSave={handleSave} />
      </div>
    </div>
  )
}
