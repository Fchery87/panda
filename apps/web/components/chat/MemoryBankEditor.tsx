'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Brain, ChevronDown, ChevronUp, Save, X } from 'lucide-react'

interface MemoryBankEditorProps {
  /** Current memory bank content — null/undefined if none exists yet */
  memoryBank: string | null | undefined
  /** Called when the user saves edits */
  onSave: (content: string) => Promise<void>
  className?: string
}

export function MemoryBankEditor({ memoryBank, onSave, className }: MemoryBankEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync draft when external value changes (e.g. first load)
  useEffect(() => {
    if (!isOpen) {
      setDraft(memoryBank ?? '')
    }
  }, [memoryBank, isOpen])

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [isOpen])

  const isDirty = draft !== (memoryBank ?? '')

  const handleSave = useCallback(async () => {
    if (!isDirty) return
    setIsSaving(true)
    try {
      await onSave(draft)
    } finally {
      setIsSaving(false)
    }
  }, [draft, isDirty, onSave])

  const handleClose = useCallback(() => {
    // Reset draft to persisted value on close without saving
    setDraft(memoryBank ?? '')
    setIsOpen(false)
  }, [memoryBank])

  const hasContent = Boolean(memoryBank?.trim())

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Trigger row */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-left',
          'border-b border-border',
          'transition-colors duration-100',
          'hover:bg-muted/40',
          isOpen && 'bg-muted/40'
        )}
      >
        <Brain
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            hasContent ? 'text-primary' : 'text-muted-foreground'
          )}
        />
        <span
          className={cn(
            'flex-1 font-mono text-xs uppercase tracking-wider',
            hasContent ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          Memory Bank
        </span>
        {hasContent && <span className="font-mono text-xs text-primary/70">active</span>}
        {isOpen ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {/* Expandable editor */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden border-b border-border"
          >
            <div className="flex flex-col gap-0">
              {/* Hint */}
              <p className="px-3 py-2 font-mono text-xs text-muted-foreground/60">
                Persistent memory injected at the start of every conversation. Write tech stack,
                conventions, or project-specific context.
              </p>

              {/* Textarea */}
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`# About this project\n- Stack: Next.js 15, Convex, Tailwind\n- Convention: all API routes in /convex\n- Prefer functional components…`}
                className={cn(
                  'max-h-64 min-h-[120px] resize-none rounded-none border-0 border-t border-border',
                  'bg-muted/20 font-mono text-[12px] leading-relaxed',
                  'focus-visible:border-primary/50 focus-visible:ring-0 focus-visible:ring-offset-0'
                )}
                rows={6}
              />

              {/* Footer actions */}
              <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
                <span className="font-mono text-xs text-muted-foreground/50">
                  {draft.length} chars
                </span>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClose}
                    disabled={isSaving}
                    className="h-6 gap-1 rounded-none px-2 font-mono text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-2.5 w-2.5" />
                    Discard
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className={cn(
                      'h-6 gap-1 rounded-none px-2 font-mono text-xs',
                      isDirty
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    <Save className="h-2.5 w-2.5" />
                    {isSaving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
