'use client'

import { useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { MessageBubble } from './MessageBubble'
import { cn } from '@/lib/utils'
import type { Message } from './types'
import type { ChatMode } from '@/lib/agent/prompt-library'

interface MessageListProps {
  messages: Message[]
  isStreaming?: boolean
  onSuggestedAction?: (prompt: string, targetMode?: ChatMode) => void
}

export function MessageList({
  messages,
  isStreaming = false,
  onSuggestedAction,
}: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' })
    }
  }, [messages.length, isStreaming, virtualizer])

  if (messages.length === 0) {
    return (
      <div className="h-full min-h-0 min-w-0 overflow-auto">
        <div
          className={cn(
            'flex h-full min-h-[300px] flex-col items-center justify-center',
            'px-6 text-center sm:px-8'
          )}
        >
          <div className="text-sm text-muted-foreground">
            <p className="mb-2 font-medium">No messages yet</p>
            <p className="max-w-[28ch] text-xs leading-relaxed">
              Start a conversation to begin chatting with the AI assistant.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={parentRef} className="h-full min-h-0 min-w-0 overflow-auto">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const message = messages[virtualRow.index]
          return (
            <div
              key={message._id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full px-3 py-2 xl:px-4"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <MessageBubble
                message={message}
                isStreaming={
                  isStreaming &&
                  virtualRow.index === messages.length - 1 &&
                  message.role === 'assistant'
                }
                onSuggestedAction={onSuggestedAction}
                disableActions={isStreaming}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
