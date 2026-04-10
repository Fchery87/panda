'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { SidebarSection } from './SidebarRail'

const SECTION_LABELS: Record<SidebarSection, string> = {
  files: 'Files',
  agents: 'Active Agents',
  search: 'Search',
  git: 'Source Control',
  deploy: 'Deploy & Preview',
  tasks: 'Task History',
}

const SECTION_DESCRIPTIONS: Record<SidebarSection, string> = {
  files: 'Navigate project files and symbols',
  agents: 'Monitor and control running agents',
  search: 'Jump into code by meaning or text',
  git: 'Review repository state and diffs',
  deploy: 'Preview builds and deployments',
  tasks: 'Browse completed and active tasks',
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
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="surface-1 h-full flex-shrink-0 overflow-hidden border-r border-border"
        >
          <div className="flex h-full flex-col" style={{ width: 260 }}>
            <div className="surface-0 shrink-0 border-b border-border px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-mono text-xs font-medium text-foreground">
                    {SECTION_LABELS[activeSection]}
                  </h2>
                </div>
                <div className="surface-1 flex h-6 min-w-6 items-center justify-center border border-border px-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
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
