'use client'

import { useState } from 'react'
import { Eye, Files } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LivePreview } from './LivePreview'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import type { Id } from '@convex/_generated/dataModel'

interface PreviewPanelProps {
  projectId: Id<'projects'>
  chatId?: Id<'chats'>
  previewUrl?: string | null
}

type SubTab = 'preview' | 'artifacts'

export function PreviewPanel({ projectId, chatId, previewUrl }: PreviewPanelProps) {
  const [subTab, setSubTab] = useState<SubTab>('preview')

  return (
    <div className="flex h-full flex-col">
      {/* Sub-tab bar */}
      <div className="surface-2 flex border-b border-border px-2">
        <button
          onClick={() => setSubTab('preview')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors duration-150',
            subTab === 'preview'
              ? 'border-b border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Eye className="h-3 w-3" />
          Preview
        </button>
        <button
          onClick={() => setSubTab('artifacts')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors duration-150',
            subTab === 'artifacts'
              ? 'border-b border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Files className="h-3 w-3" />
          Artifacts
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {subTab === 'preview' ? (
          <LivePreview url={previewUrl} />
        ) : (
          <ArtifactPanel
            projectId={projectId}
            chatId={chatId}
            isOpen={true}
            position="right"
          />
        )}
      </div>
    </div>
  )
}
