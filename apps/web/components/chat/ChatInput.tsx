'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Send, Square, MessageCircle, Hammer, Lightbulb } from 'lucide-react'

type ChatMode = 'discuss' | 'build'

interface ChatInputProps {
  mode?: ChatMode
  onModeChange?: (mode: ChatMode) => void
  discussBrainstormEnabled?: boolean
  onDiscussBrainstormEnabledChange?: (enabled: boolean) => void
  onSendMessage?: (content: string, mode: ChatMode) => void
  isStreaming?: boolean
  onStopStreaming?: () => void
}

export function ChatInput({
  mode: controlledMode,
  onModeChange,
  discussBrainstormEnabled = false,
  onDiscussBrainstormEnabledChange,
  onSendMessage,
  isStreaming = false,
  onStopStreaming,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [uncontrolledMode, setUncontrolledMode] = useState<ChatMode>('discuss')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const mode = controlledMode ?? uncontrolledMode
  const setMode = useCallback(
    (nextMode: ChatMode) => {
      onModeChange?.(nextMode)
      if (controlledMode === undefined) {
        setUncontrolledMode(nextMode)
      }
    },
    [controlledMode, onModeChange]
  )

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

  const placeholderText =
    mode === 'discuss'
      ? 'Ask a question or discuss your project...'
      : 'Tell me what to build or modify...'

  return (
    <div className="surface-2 border-t border-border p-3">
      {/* Mode Toggle */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex font-mono text-xs">
          <button
            onClick={() => setMode('discuss')}
            disabled={isStreaming}
            className={cn(
              'transition-sharp border border-r-0 px-3 py-1.5',
              mode === 'discuss'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageCircle className="mr-1.5 inline-block h-3 w-3" />
            Discuss
          </button>
          <button
            onClick={() => setMode('build')}
            disabled={isStreaming}
            className={cn(
              'transition-sharp border px-3 py-1.5',
              mode === 'build'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Hammer className="mr-1.5 inline-block h-3 w-3" />
            Build
          </button>
        </div>

        <span className="font-mono text-[10px] text-muted-foreground">Enter to send</span>
      </div>

      {mode === 'discuss' ? (
        <div className="mb-3 flex items-center justify-between border border-border px-2 py-1.5">
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <Lightbulb className="h-3 w-3" />
            Brainstorm
          </span>
          <button
            type="button"
            disabled={isStreaming}
            onClick={() => onDiscussBrainstormEnabledChange?.(!discussBrainstormEnabled)}
            className={cn(
              'transition-sharp border px-2 py-0.5 font-mono text-[10px] uppercase',
              discussBrainstormEnabled
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {discussBrainstormEnabled ? 'On' : 'Off'}
          </button>
        </div>
      ) : null}

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
            'max-h-[200px] min-h-[80px] resize-none pr-12',
            'rounded-none border border-border bg-background',
            'focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary',
            'font-mono text-sm placeholder:text-muted-foreground/50'
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
                  'transition-sharp h-7 w-7 rounded-none',
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
