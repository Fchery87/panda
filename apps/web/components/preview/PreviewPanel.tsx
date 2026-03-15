'use client'

import { LivePreview } from './LivePreview'
import type { Id } from '@convex/_generated/dataModel'

interface PreviewPanelProps {
  projectId: Id<'projects'>
  chatId?: Id<'chats'>
  previewUrl?: string | null
}

export function PreviewPanel({
  projectId: _projectId,
  chatId: _chatId,
  previewUrl,
}: PreviewPanelProps) {
  return (
    <div className="h-full">
      <LivePreview url={previewUrl} />
    </div>
  )
}
