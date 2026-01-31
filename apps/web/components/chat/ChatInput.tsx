'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
    <div className="border-t border-border surface-2 p-3">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex font-mono text-xs">
          <button
            onClick={() => setMode('discuss')}
            className={cn(
              "px-3 py-1.5 border border-r-0 transition-sharp",
              mode === 'discuss'
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:text-foreground"
            )}
          >
            <MessageCircle className="h-3 w-3 inline-block mr-1.5" />
            Discuss
          </button>
          <button
            onClick={() => setMode('build')}
            className={cn(
              "px-3 py-1.5 border transition-sharp",
              mode === 'build'
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:text-foreground"
            )}
          >
            <Hammer className="h-3 w-3 inline-block mr-1.5" />
            Build
          </button>
        </div>

        <span className="text-[10px] text-muted-foreground font-mono">
          Enter to send
        </span>
      </div>

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
            'bg-background border border-border rounded-none',
            'focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary',
            'text-sm font-mono placeholder:text-muted-foreground/50'
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
              transition={{ duration: 0.1 }}
              className="absolute bottom-3 right-3"
            >
              <Button
                size="icon"
                variant="outline"
                onClick={handleStop}
                className="h-7 w-7 rounded-none border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Square className="h-3 w-3 fill-current" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="send"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="absolute bottom-3 right-3"
            >
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim()}
                className={cn(
                  'h-7 w-7 rounded-none transition-sharp',
                  input.trim() 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                <Send className="h-3 w-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
