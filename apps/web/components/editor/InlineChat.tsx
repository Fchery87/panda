'use client'

import { appLog } from '@/lib/logger'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface InlineChatProps {
  selectedText: string
  position: { top: number; left: number }
  onClose: () => void
  onSubmit: (prompt: string, selectedText: string) => Promise<void>
}

export function InlineChat({ selectedText, position, onClose, onSubmit }: InlineChatProps) {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isLoading) return

    setIsLoading(true)
    try {
      await onSubmit(prompt.trim(), selectedText)
      onClose()
    } catch (error) {
      appLog.error('Inline chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [prompt, selectedText, isLoading, onSubmit, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
        className="fixed z-50 w-[420px] rounded-none border border-border bg-background shadow-lg"
        style={{
          top: Math.min(position.top + 24, window.innerHeight - 300),
          left: Math.min(position.left, window.innerWidth - 440),
        }}
      >
        <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-mono text-xs uppercase tracking-wider">Edit with AI</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-none"
            onClick={onClose}
            aria-label="Close inline chat"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="p-3">
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the change you want..."
            className="min-h-[80px] resize-none rounded-none border-border bg-background font-mono text-sm focus-visible:ring-primary"
            disabled={isLoading}
          />

          {selectedText && (
            <div className="mt-2 max-h-[100px] overflow-auto rounded-none border border-border bg-muted p-2">
              <div className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Selected Code
              </div>
              <pre className="whitespace-pre-wrap break-all font-mono text-xs text-muted-foreground">
                {selectedText.length > 200 ? `${selectedText.slice(0, 200)}...` : selectedText}
              </pre>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <span className="font-mono text-xs text-muted-foreground">
            <kbd className="mx-0.5 rounded-none bg-muted px-1.5 py-0.5">Enter</kbd> to submit
            <span className="mx-1">·</span>
            <kbd className="mx-0.5 rounded-none bg-muted px-1.5 py-0.5">Esc</kbd> to cancel
          </span>
          <Button
            size="sm"
            disabled={!prompt.trim() || isLoading}
            onClick={handleSubmit}
            className="h-7 rounded-none px-3 font-mono text-xs"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Submit
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
