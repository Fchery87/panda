'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReasoningPanelProps {
  content: string
  isStreaming?: boolean
}

export function ReasoningPanel({ content, isStreaming = false }: ReasoningPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="shadow-sharp-md w-full border border-border bg-muted/50">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="flex items-center gap-2 font-mono text-xs">
          <Brain className="h-3.5 w-3.5" />
          Reasoning
          {isStreaming && <span className="text-[10px] text-muted-foreground">streaming...</span>}
        </span>
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
            <div className="whitespace-pre-wrap px-3 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
