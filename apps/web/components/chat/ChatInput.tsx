'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { Send, Square, MessageCircle, Hammer } from 'lucide-react'

type ChatMode = 'discuss' | 'build'

interface ChatInputProps {
  onSendMessage?: (content: string, mode: ChatMode) => void
  isStreaming?: boolean
  onStopStreaming?: () => void
}

export function ChatInput({
  onSendMessage,
  isStreaming = false,
  onStopStreaming,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<ChatMode>('discuss')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    if (input.trim() && !isStreaming) {
      onSendMessage?.(input.trim(), mode)
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }, [input, isStreaming, mode, onSendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [])

  const handleStop = useCallback(() => {
    onStopStreaming?.()
  }, [onStopStreaming])

  useEffect(() => {
    if (textareaRef.current && !isStreaming) {
      textareaRef.current.focus()
    }
  }, [isStreaming])

  const placeholderText = mode === 'discuss' 
    ? 'Ask a question or discuss your project...' 
    : 'Tell me what to build or modify...'

  return (
    <div className="border-t border-border bg-background p-4">
      {/* Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-3"
      >
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(value) => value && setMode(value as ChatMode)}
          className="bg-muted rounded-lg p-1"
        >
          <ToggleGroupItem 
            value="discuss" 
            aria-label="Discuss mode"
            className={cn(
              'text-xs px-3 py-1.5 rounded-md transition-all duration-200',
              mode === 'discuss' && 'bg-background shadow-sm'
            )}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
            Discuss
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="build" 
            aria-label="Build mode"
            className={cn(
              'text-xs px-3 py-1.5 rounded-md transition-all duration-200',
              mode === 'build' && 'bg-background shadow-sm'
            )}
          >
            <Hammer className="h-3.5 w-3.5 mr-1.5" />
            Build
          </ToggleGroupItem>
        </ToggleGroup>

        <span className="text-[10px] text-muted-foreground">
          Enter to send • Shift+Enter for new line
        </span>
      </motion.div>

      {/* Input Area */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          disabled={isStreaming}
          className={cn(
            'min-h-[80px] max-h-[200px] pr-12 resize-none',
            'bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring',
            'text-sm placeholder:text-muted-foreground/60'
          )}
          rows={1}
        />

        {/* Action Button */}
        <AnimatePresence mode="wait">
          {isStreaming ? (
            <motion.div
              key="stop"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-3 right-3"
            >
              <Button
                size="icon"
                variant="destructive"
                onClick={handleStop}
                className="h-8 w-8 rounded-full"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="send"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-3 right-3"
            >
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim()}
                className={cn(
                  'h-8 w-8 rounded-full transition-all duration-200',
                  input.trim() 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
