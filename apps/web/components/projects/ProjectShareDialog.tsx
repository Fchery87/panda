'use client'

import type { Id } from '@convex/_generated/dataModel'
import { Link2, Share2 } from 'lucide-react'
import { ShareButton } from '@/components/chat/ShareButton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ProjectShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chatId?: Id<'chats'> | null
  chatTitle?: string
}

export function ProjectShareDialog({
  open,
  onOpenChange,
  chatId,
  chatTitle,
}: ProjectShareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-wide">
            <Share2 className="h-4 w-4" />
            Share Chat
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {chatId
              ? 'Create a public, read-only link for the current chat session.'
              : 'Choose or start a chat before creating a share link.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 border border-border bg-muted/20 p-3">
          <div className="flex items-start gap-2">
            <Link2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-1 font-mono text-xs">
              <div className="uppercase tracking-wide text-muted-foreground">Current Chat</div>
              <div className="text-foreground">
                {chatTitle?.trim() || (chatId ? 'Untitled chat' : 'No active chat')}
              </div>
            </div>
          </div>

          {chatId ? (
            <ShareButton chatId={chatId} className="justify-end" />
          ) : (
            <div className="font-mono text-xs text-muted-foreground">
              Sharing is only available when a chat is selected.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
