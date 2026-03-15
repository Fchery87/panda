'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, FileIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GitDiffFile } from '@/lib/chat/parseGitDiff'

interface GitDiffViewerProps {
  files: GitDiffFile[]
}

export function GitDiffViewer({ files }: GitDiffViewerProps) {
  if (files.length === 0) {
    return (
      <div className="border border-border bg-muted/20 p-3 font-mono text-[11px] text-muted-foreground">
        No changes
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {files.map((file, i) => (
        <FileDiff key={`${file.filePath}-${i}`} file={file} />
      ))}
    </div>
  )
}

function FileDiff({ file }: { file: GitDiffFile }) {
  const [collapsed, setCollapsed] = useState(false)

  const addCount = file.hunks.flatMap((h) => h.lines).filter((l) => l.type === 'add').length
  const removeCount = file.hunks.flatMap((h) => h.lines).filter((l) => l.type === 'remove').length

  return (
    <div className="border border-border bg-background">
      {/* File header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-2 border-b border-border bg-muted/50 px-3 py-1.5 text-left hover:bg-muted/80"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate font-mono text-xs">{file.filePath}</span>
        <span className="shrink-0 font-mono text-xs text-green-600">+{addCount}</span>
        <span className="ml-1 shrink-0 font-mono text-xs text-red-600">-{removeCount}</span>
      </button>

      {!collapsed && (
        <div className="max-h-[360px] overflow-auto font-mono text-[11px]">
          {file.hunks.map((hunk, hi) => (
            <div key={hi}>
              {/* Hunk header */}
              <div className="bg-blue-500/5 px-3 py-0.5 text-[10px] text-muted-foreground/70">
                @@ -{hunk.oldStart},{hunk.oldCount} +{hunk.newStart},{hunk.newCount} @@
              </div>

              {hunk.lines.map((line, li) => (
                <div
                  key={li}
                  className={cn(
                    'flex px-2 py-0.5 leading-5',
                    line.type === 'add' && 'bg-green-500/10 dark:bg-green-500/20',
                    line.type === 'remove' && 'bg-red-500/10 dark:bg-red-500/20'
                  )}
                >
                  <span
                    className={cn(
                      'mr-2 w-3 shrink-0 select-none',
                      line.type === 'add' && 'text-green-700 dark:text-green-300',
                      line.type === 'remove' && 'text-red-700 dark:text-red-300',
                      line.type === 'context' && 'text-muted-foreground/50'
                    )}
                  >
                    {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                  </span>
                  <span
                    className={cn(
                      'whitespace-pre',
                      line.type === 'add' && 'text-green-700 dark:text-green-300',
                      line.type === 'remove' && 'text-red-700 dark:text-red-300'
                    )}
                  >
                    {line.content}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
