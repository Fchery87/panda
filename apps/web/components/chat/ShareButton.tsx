'use client'

import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Copy, Share2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShareButtonProps {
  chatId: string
  className?: string
}

export function ShareButton({ chatId, className }: ShareButtonProps) {
  const typedChatId = chatId as Id<'chats'>
  const shareStatus = useQuery(api.sharing.getChatShareStatus, { chatId: typedChatId })
  const shareChat = useMutation(api.sharing.shareChat)
  const unshareChat = useMutation(api.sharing.unshareChat)

  const handleShare = async () => {
    try {
      const shareId = await shareChat({ chatId: typedChatId })
      const shareUrl = `${window.location.origin}/s/${shareId}`
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied to clipboard!')
    } catch (error) {
      void error
      toast.error('Failed to share chat')
    }
  }

  const handleUnshare = async () => {
    try {
      await unshareChat({ chatId: typedChatId })
      toast.success('Chat unshared')
    } catch (error) {
      void error
      toast.error('Failed to unshare chat')
    }
  }

  const handleCopyLink = async () => {
    if (!shareStatus?.shareId) return

    const shareUrl = `${window.location.origin}/s/${shareStatus.shareId}`
    await navigator.clipboard.writeText(shareUrl)
    toast.success('Link copied to clipboard!')
  }

  if (shareStatus) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          onClick={handleCopyLink}
          variant="outline"
          size="sm"
          className="h-7 gap-1 rounded-none px-2 font-mono text-xs"
          title="Copy shared link"
          aria-label="Copy shared link"
        >
          <Copy className="h-3.5 w-3.5" />
          <span className="hidden 2xl:inline">Copy Link</span>
        </Button>
        <Button
          onClick={handleUnshare}
          variant="outline"
          size="sm"
          className="h-7 gap-1 rounded-none px-2 font-mono text-xs"
          title="Unshare chat"
          aria-label="Unshare chat"
        >
          <X className="h-3.5 w-3.5" />
          <span className="hidden 2xl:inline">Unshare</span>
        </Button>
      </div>
    )
  }

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      size="sm"
      className={cn('h-7 gap-1 rounded-none px-2 font-mono text-xs', className)}
      title="Share chat"
      aria-label="Share chat"
    >
      <Share2 className="h-3.5 w-3.5" />
      <span className="hidden 2xl:inline">Share</span>
    </Button>
  )
}
