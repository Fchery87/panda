'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Brain, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReasoningPanelProps {
  content: string
  isStreaming?: boolean
  teaser?: string
  redacted?: boolean
  defaultOpen?: boolean
}

function buildTeaser(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 120) return normalized
  return `${normalized.slice(0, 117).trimEnd()}…`
}

export function ReasoningPanel({
  content,
  isStreaming = false,
  teaser,
  redacted = false,
  defaultOpen = false,
}: ReasoningPanelProps) {
  const [open, setOpen] = useState(defaultOpen || isStreaming)
  const shouldReduceMotion = useReducedMotion()
  const preview = teaser ?? buildTeaser(content)
  const label = redacted ? 'Thinking used' : 'Thinking'
  const collapsedPreview = redacted ? 'summary unavailable' : preview
  const panelId = `thinking-panel-${label.toLowerCase().replace(/\s+/g, '-')}`

  useEffect(() => {
    if (isStreaming) {
      setOpen(true)
    } else if (!defaultOpen) {
      setOpen(false)
    }
  }, [defaultOpen, isStreaming])

  return (
    <div className="shadow-sharp-md w-full border border-border bg-muted/40">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="flex min-w-0 items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          <Brain className="h-3.5 w-3.5" />
          {label}
          {isStreaming && <span className="text-[10px] text-muted-foreground/80">streaming…</span>}
        </span>
        {!open ? (
          <span className="min-w-0 flex-1 truncate pr-2 text-right font-mono text-[10px] text-muted-foreground/70">
            {collapsedPreview}
          </span>
        ) : null}
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform', open ? 'rotate-180' : 'rotate-0')}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="whitespace-pre-wrap break-words px-3 py-2 font-mono text-[11px] leading-5 text-muted-foreground/90">
              {redacted ? 'Thinking was used, but no display-safe summary was returned.' : content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
