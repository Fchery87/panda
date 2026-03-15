'use client'

import { useQuery } from 'convex/react'
import type { Id } from '@convex/_generated/dataModel'
import { api } from '@convex/_generated/api'
import { Clock, FileDiff, GitBranch } from 'lucide-react'

import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface SidebarGitPanelProps {
  projectId: Id<'projects'>
}

export function SidebarGitPanel({ projectId }: SidebarGitPanelProps) {
  const files = useQuery(api.files.list, { projectId })

  const recentlyChanged = [...(files ?? [])].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 20)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-xs text-muted-foreground">main</span>
      </div>

      <div className="border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Changed Files ({recentlyChanged.length})
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1">
          {recentlyChanged.length === 0 ? (
            <div className="px-3 py-6 text-center font-mono text-xs text-muted-foreground">
              No file changes
            </div>
          ) : (
            recentlyChanged.map((file) => (
              <div
                key={file._id}
                className={cn(
                  'hover:bg-surface-2 flex items-start gap-2 border border-transparent px-3 py-2 transition-colors hover:border-border'
                )}
              >
                <FileDiff className="mt-0.5 h-3.5 w-3.5 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-xs text-foreground">{file.path}</div>
                  <div className="mt-1 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(file.updatedAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
