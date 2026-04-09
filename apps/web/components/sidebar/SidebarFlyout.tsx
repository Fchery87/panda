'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { SidebarSection } from './SidebarRail'

const SECTION_LABELS: Record<SidebarSection, string> = {
  explorer: 'Explorer',
  search: 'Search',
  history: 'History',
  specs: 'Specifications',
  git: 'Source Control',
  terminal: 'Terminal',
}

const SECTION_DESCRIPTIONS: Record<SidebarSection, string> = {
  explorer: 'Navigate project files and symbols',
  search: 'Jump into code by meaning or text',
  history: 'Move across prior runs and chats',
  specs: 'Track constraints and implementation plans',
  git: 'Review repository state and diffs',
  terminal: 'Launch shell commands in context',
}

interface SidebarFlyoutProps {
  isOpen: boolean
  activeSection: SidebarSection
  children: ReactNode
}

export function SidebarFlyout({ isOpen, activeSection, children }: SidebarFlyoutProps) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 220, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="surface-1 h-full flex-shrink-0 overflow-hidden border-r border-border"
        >
          <div className="flex h-full w-[220px] flex-col">
            <div className="surface-0 shrink-0 border-b border-border px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                    Panel
                  </p>
                  <h2 className="mt-1 font-mono text-sm font-medium text-foreground">
                    {SECTION_LABELS[activeSection]}
                  </h2>
                </div>
                <div className="surface-1 flex h-7 min-w-7 items-center justify-center border border-border px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {SECTION_LABELS[activeSection].slice(0, 2)}
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {SECTION_DESCRIPTIONS[activeSection]}
              </p>
            </div>
            <div className="flex-1 overflow-auto">{children}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
