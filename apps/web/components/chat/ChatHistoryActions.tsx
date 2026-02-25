'use client'

import { appLog } from '@/lib/logger'
import * as React from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { GitFork, Undo2, MoreHorizontal } from 'lucide-react'

interface ChatHistoryActionsProps {
  chatId: Id<'chats'>
  messageCount?: number
  className?: string
}

export function ChatHistoryActions({ chatId, messageCount, className }: ChatHistoryActionsProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [showMenu, setShowMenu] = React.useState(false)

  const forkChat = useMutation(api.chats.fork)

  const handleFork = async () => {
    setIsLoading(true)
    try {
      await forkChat({ chatId })
      toast.success('Chat forked!', {
        description: 'A copy of this conversation has been created',
      })
      setShowMenu(false)
    } catch (error) {
      toast.error('Failed to fork chat')
      appLog.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        className="h-7 rounded-none px-2 font-mono text-xs"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </Button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] border border-border bg-background shadow-lg">
            <button
              onClick={handleFork}
              disabled={isLoading}
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-xs transition-colors hover:bg-muted disabled:opacity-50"
            >
              <GitFork className="h-3.5 w-3.5" />
              Fork this chat
            </button>
            {messageCount && messageCount > 1 && (
              <button
                onClick={() => {
                  toast.info('Revert feature coming soon')
                  setShowMenu(false)
                }}
                disabled={isLoading}
                className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-xs transition-colors hover:bg-muted disabled:opacity-50"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Revert to...
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
