'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isStreaming])

  if (messages.length === 0) {
    return (
      <ScrollArea className="h-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
        </motion.div>
      </ScrollArea>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div
        className={cn('flex min-h-full flex-col gap-4 p-3 xl:gap-5 xl:p-4')}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.map((message, index) => {
          return (
            <motion.div
              key={message._id}
              initial={{ opacity: 0, x: message.role === 'user' ? 20 : -20, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <MessageBubble
                message={message}
                isStreaming={
                  isStreaming && index === messages.length - 1 && message.role === 'assistant'
                }
                onSuggestedAction={onSuggestedAction}
                disableActions={isStreaming}
              />
            </motion.div>
          )
        })}
        <div ref={bottomRef} className="h-1" />
      </div>
    </ScrollArea>
  )
}
