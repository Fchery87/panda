'use client'

import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Copy, Share2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShareButtonProps {
  chatId: string
  className?: string
}

export function ShareButton({ chatId, className }: ShareButtonProps) {
  const shareStatus = useQuery(api.sharing.getChatShareStatus, { chatId: chatId as any })
  const shareChat = useMutation(api.sharing.shareChat)
  const unshareChat = useMutation(api.sharing.unshareChat)

  const handleShare = async () => {
    try {
      const shareId = await shareChat({ chatId: chatId as any })
      const shareUrl = `${window.location.origin}/s/${shareId}`
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied to clipboard!')
    } catch (error) {
      toast.error('Failed to share chat')
      console.error(error)
    }
  }

  const handleUnshare = async () => {
    try {
      await unshareChat({ chatId: chatId as any })
      toast.success('Chat unshared')
    } catch (error) {
      toast.error('Failed to unshare chat')
      console.error(error)
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
          className="rounded-none font-mono"
        >
          <Copy className="mr-1 h-4 w-4" />
          Copy Link
        </Button>
        <Button
          onClick={handleUnshare}
          variant="outline"
          size="sm"
          className="rounded-none font-mono"
        >
          <X className="mr-1 h-4 w-4" />
          Unshare
        </Button>
      </div>
    )
  }

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      size="sm"
      className={cn('rounded-none font-mono', className)}
    >
      <Share2 className="mr-1 h-4 w-4" />
      Share
    </Button>
  )
}
