'use client'

import { appLog } from '@/lib/logger'
import * as React from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { GitFork, MoreHorizontal } from 'lucide-react'

interface ChatHistoryActionsProps {
  chatId: Id<'chats'>
  messageCount?: number
  className?: string
}

export function ChatHistoryActions({
  chatId,
  messageCount: _messageCount,
  className,
}: ChatHistoryActionsProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  const forkChat = useMutation(api.chats.fork)

  const handleFork = async () => {
    setIsLoading(true)
    try {
      await forkChat({ chatId })
      toast.success('Chat forked!', {
        description: 'A copy of this conversation has been created',
      })
    } catch (error) {
      toast.error('Failed to fork chat')
      appLog.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Open chat history actions"
          className={cn('h-7 rounded-none px-2 font-mono text-xs', className)}
        >
          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-none border-border font-mono">
        <DropdownMenuItem
          onSelect={() => {
            void handleFork()
          }}
          disabled={isLoading}
          className="rounded-none text-xs uppercase tracking-wide"
        >
          <GitFork className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          Fork This Chat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
