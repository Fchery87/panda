'use client'

import { Eye } from 'lucide-react'
import { DiffViewer } from '@/components/diff/DiffViewer'
import type { WorkspaceArtifactPreview } from './artifact-preview'

interface PendingArtifactOverlayProps {
  preview: WorkspaceArtifactPreview
  onApply: (artifactId: string) => void
  onReject: (artifactId: string) => void
}

export function PendingArtifactOverlay({
  preview,
  onApply,
  onReject,
}: PendingArtifactOverlayProps) {
  return (
    <div className="surface-1 flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <div className="min-w-0">
            <div className="font-mono text-xs uppercase tracking-widest text-primary">
              Pending Artifact Preview
            </div>
            <div className="truncate font-mono text-xs text-muted-foreground">
              {preview.filePath}
            </div>
          </div>
        </div>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <DiffViewer
          original={preview.originalContent}
          modified={preview.pendingContent}
          fileName={preview.filePath}
          onApply={() => onApply(preview.artifactId)}
          onReject={() => onReject(preview.artifactId)}
        />
      </div>
    </div>
  )
}
