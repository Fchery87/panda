'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from './MessageBubble'
import { cn } from '@/lib/utils'
import type { Message } from './types'

interface MessageListProps {
  messages: Message[]
  isStreaming?: boolean
  onResendInBuild?: (content: string) => void
}

export function MessageList({
  messages,
  isStreaming = false,
  onResendInBuild,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
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
            'flex flex-col items-center justify-center h-full min-h-[300px]',
            'text-center px-8'
          )}
        >
          <div className="text-muted-foreground text-sm">
            <p className="font-medium mb-2">No messages yet</p>
            <p className="text-xs">Start a conversation to begin chatting with the AI assistant.</p>
          </div>
        </motion.div>
      </ScrollArea>
    )
  }

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
	      <div className={cn('flex flex-col gap-4 p-4 min-h-full')}>
	        {messages.map((message, index) => {
	          let resendInBuildContent: string | undefined
	          if (message.role === 'assistant' && message.annotations?.mode === 'discuss') {
	            for (let i = index - 1; i >= 0; i--) {
	              if (messages[i]?.role === 'user') {
	                // Build mode will automatically include the current Plan Draft panel content in the prompt.
	                // Make the handoff explicit so models that hesitate to use tools will start executing.
	                resendInBuildContent =
	                  "Implement the current Plan Draft now. " +
	                  "Create/modify files using tools (write_files) and run commands using tools (run_command)."
	                break
	              }
	            }
	          }

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
                isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
                resendInBuildContent={resendInBuildContent}
                onResendInBuild={onResendInBuild}
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
