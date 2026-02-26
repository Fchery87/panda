'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'
import type { SuggestedAction } from './types'
import type { ChatMode } from '@/lib/agent/prompt-library'

interface SuggestedActionsProps {
  actions: SuggestedAction[]
  disabled?: boolean
  onAction: (prompt: string, targetMode?: ChatMode) => void
}

export function SuggestedActions({ actions, disabled = false, onAction }: SuggestedActionsProps) {
  if (!actions || actions.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="mt-2 flex flex-wrap gap-1.5"
      >
        {actions.map((action, idx) => (
          <motion.button
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15, delay: idx * 0.05 }}
            disabled={disabled}
            onClick={() => onAction(action.prompt, action.targetMode)}
            className={cn(
              'group flex items-center gap-1.5',
              'rounded-none border border-border bg-background',
              'px-2 py-1 font-mono text-[11px] text-muted-foreground xl:px-2.5 xl:text-xs',
              'transition-all duration-150',
              'hover:border-primary/50 hover:bg-primary/5 hover:text-foreground',
              'disabled:cursor-not-allowed disabled:opacity-40',
              // Highlight actions that switch mode
              action.targetMode &&
                'border-primary/20 text-primary/80 hover:border-primary hover:bg-primary/10 hover:text-primary'
            )}
          >
            <span className="max-w-[26ch] truncate">{action.label}</span>
            <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </motion.button>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}
