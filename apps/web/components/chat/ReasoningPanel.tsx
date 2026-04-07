'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReasoningPanelProps {
  content: string
  isStreaming?: boolean
  teaser?: string
  redacted?: boolean
}

function buildTeaser(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 120) return normalized
  return `${normalized.slice(0, 117).trimEnd()}...`
}

export function ReasoningPanel({
  content,
  isStreaming = false,
  teaser,
  redacted = false,
}: ReasoningPanelProps) {
  const [open, setOpen] = useState(false)
  const preview = teaser ?? buildTeaser(content)
  const label = redacted ? 'Thinking retained' : 'Thinking'

  return (
    <div className="shadow-sharp-md w-full border border-border bg-muted/40">
      <button
        type="button"
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
            {redacted ? 'available in run trace' : preview}
          </span>
        ) : null}
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform', open ? 'rotate-180' : 'rotate-0')}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="whitespace-pre-wrap break-words px-3 py-2 font-mono text-[11px] leading-5 text-muted-foreground/90">
              {redacted ? 'Thinking is retained in the run trace for this step.' : content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
