'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { SidebarSection } from './SidebarRail'

const SECTION_LABELS: Record<SidebarSection, string> = {
  'new-chat': 'New Chat',
  'explorer': 'Explorer',
  'search': 'Search',
  'history': 'History',
  'builder': 'Preview',
  'specs': 'Specifications',
  'terminal': 'Terminal',
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
            <div className="panel-header-compact shrink-0">
              {SECTION_LABELS[activeSection]}
            </div>
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
