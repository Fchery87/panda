'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { SidebarSection } from './SidebarRail'

const SECTION_LABELS: Record<SidebarSection, string> = {
  files: 'Explorer',
  agents: 'Runs',
  search: 'Search',
  git: 'Source Control',
  tasks: 'Sessions',
}

const SECTION_DESCRIPTIONS: Record<SidebarSection, string> = {
  files: 'Open files only when you need implementation detail.',
  agents: 'Monitor active and background execution sessions.',
  search: 'Find files, symbols, and project context quickly.',
  git: 'Review repository state before accepting work.',
  tasks: 'Switch between current and past agent sessions.',
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
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="h-full flex-shrink-0 overflow-hidden border-r border-border bg-card"
        >
          <div className="flex h-full flex-col" style={{ width: 240 }}>
            <div className="shrink-0 border-b border-border bg-card px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-medium text-foreground">
                    {SECTION_LABELS[activeSection]}
                  </h2>
                </div>
                <div className="flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-background px-1.5 text-[10px] text-primary">
                  {SECTION_LABELS[activeSection].slice(0, 3)}
                </div>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
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
