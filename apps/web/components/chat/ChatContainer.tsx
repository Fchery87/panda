'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { cn } from '@/lib/utils'
import { ChevronLeft, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import type { Message } from './types'

interface ChatContainerProps {
  projectId: string
  isOpen?: boolean
  onToggle?: (isOpen: boolean) => void
  messages?: Message[]
  isStreaming?: boolean
  onSendMessage?: (content: string, mode: 'discuss' | 'build') => void
  onStopStreaming?: () => void
}

export function ChatContainer({
  projectId,
  isOpen: controlledIsOpen,
  onToggle,
  messages = [],
  isStreaming = false,
  onSendMessage,
  onStopStreaming,
}: ChatContainerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen

  const handleToggle = () => {
    const newState = !isOpen
    if (onToggle) {
      onToggle(newState)
    } else {
      setInternalIsOpen(newState)
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              'fixed right-0 top-0 h-full w-[400px]',
              'bg-background border-l border-border',
              'flex flex-col shadow-2xl z-50'
            )}
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={cn(
                'flex items-center justify-between px-4 py-3',
                'border-b border-border bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Chat</span>
                <span className="text-xs text-muted-foreground">({projectId})</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggle}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </motion.div>

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden">
              <MessageList messages={messages} isStreaming={isStreaming} />
            </div>

            {/* Input Area */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <ChatInput
                onSendMessage={onSendMessage}
                isStreaming={isStreaming}
                onStopStreaming={onStopStreaming}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button when closed */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={handleToggle}
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
