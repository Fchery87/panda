'use client'

import { Eye, Layers } from 'lucide-react'
import { DiffViewer } from '@/components/diff/DiffViewer'
import { Button } from '@/components/ui/button'
import type { WorkspaceArtifactPreview } from './artifact-preview'

interface PendingArtifactOverlayProps {
  preview: WorkspaceArtifactPreview
  onApply: (artifactId: string) => void
  onReject: (artifactId: string) => void
  onOpenArtifacts: () => void
}

export function PendingArtifactOverlay({
  preview,
  onApply,
  onReject,
  onOpenArtifacts,
}: PendingArtifactOverlayProps) {
  return (
    <div className="surface-1 border-b border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-none font-mono text-xs"
          onClick={onOpenArtifacts}
        >
          <Layers className="mr-1.5 h-3.5 w-3.5" />
          Artifacts
        </Button>
      </div>
      <div className="max-h-80 overflow-hidden">
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
