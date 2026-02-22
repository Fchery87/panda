'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Send, Square, Lightbulb } from 'lucide-react'
import { AgentSelector, MODE_OPTIONS } from './AgentSelector'
import { MentionPicker } from './MentionPicker'
import { ModelSelector } from './ModelSelector'
import { VariantSelector } from './VariantSelector'
import type { ChatMode } from '@/lib/agent/prompt-library'

/**
 * Parse @-mention tokens from the message text.
 * Returns the cleaned message (tokens removed) and extracted file paths.
 */
function parseMentions(text: string): { message: string; contextFiles: string[] } {
  const contextFiles: string[] = []
  const message = text
    .replace(/@([^\s@]+)/g, (_, path) => {
      contextFiles.push(path)
      return ''
    })
    .replace(/\s+/g, ' ')
    .trim()
  return { message, contextFiles }
}

interface ChatInputProps {
  mode?: ChatMode
  onModeChange?: (mode: ChatMode) => void
  architectBrainstormEnabled?: boolean
  onArchitectBrainstormEnabledChange?: (enabled: boolean) => void
  onSendMessage?: (content: string, mode: ChatMode, contextFiles?: string[]) => void
  isStreaming?: boolean
  onStopStreaming?: () => void
  /** File paths available for @-mention context, from the project file tree */
  filePaths?: string[]
  /** Selected AI model */
  model?: string
  onModelChange?: (model: string) => void
  /** Reasoning variant (effort level) */
  variant?: string
  onVariantChange?: (variant: string) => void
  /** Whether the current model supports reasoning variants */
  supportsReasoning?: boolean
}

export function ChatInput({
  mode: controlledMode,
  onModeChange,
  architectBrainstormEnabled = false,
  onArchitectBrainstormEnabledChange,
  onSendMessage,
  isStreaming = false,
  onStopStreaming,
  filePaths = [],
  model,
  onModelChange,
  variant = 'none',
  onVariantChange,
  supportsReasoning = false,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [uncontrolledMode, setUncontrolledMode] = useState<ChatMode>('code')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // @-mention picker state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState<number>(-1)

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
      const { message, contextFiles } = parseMentions(input.trim())
      onSendMessage?.(message || input.trim(), mode, contextFiles)
      setInput('')
      setMentionQuery(null)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }, [input, isStreaming, mode, onSendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Don't send on Enter if mention picker is open (handled by picker itself)
      if (mentionQuery !== null) return
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend, mentionQuery]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setInput(val)

      // Auto-resize
      const textarea = e.target
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`

      // Detect @-mention trigger
      const cursor = e.target.selectionStart ?? val.length
      const textBeforeCursor = val.slice(0, cursor)
      const atMatch = textBeforeCursor.match(/@([^\s@]*)$/)

      if (atMatch && filePaths.length > 0) {
        setMentionQuery(atMatch[1])
        setMentionStart(cursor - atMatch[0].length)
      } else {
        setMentionQuery(null)
      }
    },
    [filePaths]
  )

  const handleMentionSelect = useCallback(
    (path: string) => {
      if (mentionStart < 0) return
      // Replace the @query token with @path + space
      const before = input.slice(0, mentionStart)
      const after = input.slice(
        input.indexOf(' ', mentionStart + 1) === -1
          ? input.length
          : input.indexOf(' ', mentionStart + 1)
      )
      const newVal = `${before}@${path} ${after}`
      setInput(newVal)
      setMentionQuery(null)
      // Restore focus
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          const pos = (before + `@${path} `).length
          textareaRef.current.setSelectionRange(pos, pos)
        }
      }, 0)
    },
    [input, mentionStart]
  )

  const handleStop = useCallback(() => {
    onStopStreaming?.()
  }, [onStopStreaming])

  useEffect(() => {
    if (textareaRef.current && !isStreaming) {
      textareaRef.current.focus()
    }
  }, [isStreaming])

  const currentModeOption = MODE_OPTIONS.find((m) => m.value === mode)
  const placeholderText = currentModeOption
    ? `${currentModeOption.description}...`
    : 'Type your message...'

  const showBrainstormToggle = mode === 'architect'

  return (
    <div className="surface-2 border-t border-border p-3">
      <div className="relative">
        {/* @-mention picker */}
        {mentionQuery !== null && (
          <MentionPicker
            filePaths={filePaths}
            query={mentionQuery}
            onSelect={handleMentionSelect}
            onClose={() => setMentionQuery(null)}
          />
        )}

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

      {/* Bottom toolbar: mode selector + model selector + brainstorm toggle + hint */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <AgentSelector mode={mode} onModeChange={setMode} disabled={isStreaming} />

        {onModelChange && (
          <ModelSelector
            value={model || 'claude-sonnet-4-5'}
            onChange={onModelChange}
            disabled={isStreaming}
          />
        )}

        {supportsReasoning && onVariantChange && (
          <VariantSelector currentVariant={variant} onVariantChange={onVariantChange} />
        )}

        {showBrainstormToggle ? (
          <button
            type="button"
            disabled={isStreaming}
            onClick={() => onArchitectBrainstormEnabledChange?.(!architectBrainstormEnabled)}
            className={cn(
              'transition-sharp flex items-center gap-1 border px-2 py-1 font-mono text-xs uppercase tracking-wide',
              architectBrainstormEnabled
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
            )}
          >
            <Lightbulb className="h-3 w-3" />
            Brainstorm
          </button>
        ) : null}

        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {filePaths.length > 0 ? '@ to mention a file · ' : ''}Enter to send
        </span>
      </div>
    </div>
  )
}
