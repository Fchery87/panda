'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { cn } from '@/lib/utils'
import { Bot, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Message } from './types'

type ChatMode = 'discuss' | 'build'

interface ChatContainerProps {
  messages: Message[]
  mode: ChatMode
  onModeChange: (mode: ChatMode) => void
  onSendMessage: (content: string, mode: ChatMode) => void
  isStreaming?: boolean
  onStopStreaming?: () => void
  onResendInBuild?: (content: string) => void
  className?: string
}

export function ChatContainer({
  messages,
  mode,
  onModeChange,
  onSendMessage,
  isStreaming = false,
  onStopStreaming,
  onResendInBuild,
  className,
}: ChatContainerProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={cn('relative flex h-full', className)}>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'absolute -left-3 top-4 z-10 h-6 w-6 rounded-none',
          'border border-border bg-background',
          'transition-sharp hover:border-primary hover:text-primary'
        )}
      >
        {isOpen ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="surface-1 h-full overflow-hidden border-l border-border"
          >
            <div className="flex h-full w-[360px] flex-col">
              {/* Header */}
              <div className="panel-header flex items-center gap-2" data-number="05">
                <Bot className="h-3.5 w-3.5 text-primary" />
                <span>Chat</span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-hidden">
                <MessageList
                  messages={messages}
                  isStreaming={isStreaming}
                  onResendInBuild={onResendInBuild}
                />
              </div>

              {/* Input */}
              <ChatInput
                mode={mode}
                onModeChange={onModeChange}
                onSendMessage={onSendMessage}
                isStreaming={isStreaming}
                onStopStreaming={onStopStreaming}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
