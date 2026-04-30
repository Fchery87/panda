'use client'

import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp } from 'lucide-react'
import { TabBar, type TabBarTab } from '@/components/ui/tab-bar'
import { cn } from '@/lib/utils'

export type RightPanelTabId = 'chat' | 'run' | 'changes' | 'context' | 'preview'

export type InspectorTabDef = TabBarTab<string>

interface RightPanelProps {
  chatContent: ReactNode
  inspectorContent?: ReactNode
  inspectorTabs?: InspectorTabDef[]
  activeInspectorTab?: string
  onInspectorTabChange?: (tab: string) => void
  isInspectorOpen?: boolean
  onInspectorToggle?: () => void
  inspectorTitle?: string
  inspectorSummary?: string
  inspectorEyebrow?: string
}

const DRAWER_VARIANTS = {
  hidden: { height: 0 },
  visible: { height: '35%' },
}

const DRAWER_TRANSITION = { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }

export function RightPanel({
  chatContent,
  inspectorContent,
  inspectorTabs = [],
  activeInspectorTab,
  onInspectorTabChange,
  isInspectorOpen = false,
  onInspectorToggle,
  inspectorTitle = 'Evidence Surface',
  inspectorSummary = 'Run proof, receipts, snapshots, subagents, specs, and validation.',
  inspectorEyebrow = 'Evidence Surface',
}: RightPanelProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{chatContent}</div>

      <button
        type="button"
        onClick={onInspectorToggle}
        className={cn(
          'flex h-6 shrink-0 items-center justify-center border-t border-border',
          'hover:bg-surface-2 transition-colors',
          inspectorTabs.length === 0 && 'hidden'
        )}
        aria-label={isInspectorOpen ? 'Close inspector' : 'Open inspector'}
      >
        <ChevronUp
          className={cn(
            'h-3 w-3 text-muted-foreground transition-transform duration-200',
            !isInspectorOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isInspectorOpen && (
          <motion.div
            key="inspector-drawer"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={DRAWER_VARIANTS}
            transition={DRAWER_TRANSITION}
            className="flex min-h-0 flex-col overflow-hidden border-t border-border"
          >
            <div className="surface-1 border-b border-border px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {inspectorEyebrow}
                  </div>
                  <h2 className="text-sm font-medium text-foreground">{inspectorTitle}</h2>
                </div>
                <button
                  type="button"
                  onClick={onInspectorToggle}
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Collapse
                </button>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {inspectorSummary}
              </p>
            </div>
            <TabBar
              tabs={inspectorTabs}
              activeTab={activeInspectorTab ?? ''}
              onTabChange={onInspectorTabChange}
              className="h-8 shrink-0 overflow-x-auto"
              tabsClassName="scrollbar-hide min-w-max"
              tabClassName="whitespace-nowrap text-[11px]"
            />
            <div className="min-h-0 min-w-0 flex-1 overflow-auto">{inspectorContent}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
