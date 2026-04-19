'use client'

import { motion } from 'framer-motion'
import {
  IconQuickAction,
  IconDiff,
  IconAgents,
  IconFile,
  IconHealth,
  IconNewChat,
  IconUpload,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

interface WorkspaceHomeProps {
  recentFiles?: Array<{ path: string; timeAgo: string }>
  pendingDiffs?: number
  activeAgents?: number
  problemCount?: number
  devServerRunning?: boolean
  onOpenFile?: (path: string) => void
  onOpenDiffView?: () => void
  onStartAgent?: () => void
  onOpenTerminal?: () => void
  suggestedActions?: Array<{ label: string; action: () => void }>
}

export function WorkspaceHome({
  recentFiles = [],
  pendingDiffs = 0,
  activeAgents = 0,
  problemCount = 0,
  devServerRunning = false,
  onOpenFile,
  onOpenDiffView,
  onStartAgent,
  onOpenTerminal,
  suggestedActions = [],
}: WorkspaceHomeProps) {
  return (
    <div className="dot-grid scrollbar-thin h-full overflow-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Get Started — shown when workspace is empty */}
        {recentFiles.length === 0 && pendingDiffs === 0 && activeAgents === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8 border border-border bg-background/80 p-6"
          >
            <h2 className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Get Started
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Begin working on your project. Create a file, start a conversation, or import existing
              code.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Button
                variant="outline"
                className="h-10 justify-start gap-2 rounded-none font-mono text-xs"
                onClick={() => onOpenFile?.('')}
              >
                <IconFile className="h-4 w-4" weight="duotone" />
                Create File
              </Button>
              <Button
                variant="outline"
                className="h-10 justify-start gap-2 rounded-none font-mono text-xs"
                onClick={onStartAgent}
              >
                <IconNewChat className="h-4 w-4" />
                Start Chat
              </Button>
              <Button
                variant="outline"
                className="h-10 justify-start gap-2 rounded-none font-mono text-xs"
                onClick={onOpenTerminal}
              >
                <IconUpload className="h-4 w-4" />
                Import Project
              </Button>
            </div>
          </motion.div>
        )}
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <h1 className="font-mono text-lg font-semibold text-foreground">Workspace</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Your operational home — active work, pending reviews, and suggested next steps.
          </p>
        </motion.div>

        {/* Status cards */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          {/* Active Agents */}
          <div className="surface-1 border border-border p-3">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <IconAgents className="h-3.5 w-3.5" weight="duotone" />
              Agents
            </div>
            <div className="mt-1.5 font-mono text-xl font-semibold text-foreground">
              {activeAgents}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {activeAgents > 0 ? 'running' : 'idle'}
            </div>
          </div>

          {/* Pending Diffs */}
          <button
            type="button"
            onClick={onOpenDiffView}
            className="surface-1 hover:bg-surface-2 border border-border p-3 text-left transition-colors"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <IconDiff className="h-3.5 w-3.5" weight="duotone" />
              Diffs
            </div>
            <div className="mt-1.5 font-mono text-xl font-semibold text-foreground">
              {pendingDiffs}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {pendingDiffs > 0 ? 'pending review' : 'clean'}
            </div>
          </button>

          {/* Problems */}
          <div className="surface-1 border border-border p-3">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <IconHealth className="h-3.5 w-3.5" weight="duotone" />
              Problems
            </div>
            <div className="mt-1.5 font-mono text-xl font-semibold text-foreground">
              {problemCount}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {problemCount > 0 ? 'unresolved' : 'all clear'}
            </div>
          </div>

          {/* Dev Server */}
          <button
            type="button"
            onClick={onOpenTerminal}
            className="surface-1 hover:bg-surface-2 border border-border p-3 text-left transition-colors"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span
                className={`h-2 w-2 ${devServerRunning ? 'bg-[hsl(var(--status-success))]' : 'bg-muted-foreground/30'}`}
              />
              Dev Server
            </div>
            <div className="mt-1.5 font-mono text-sm font-semibold text-foreground">
              {devServerRunning ? 'Running' : 'Stopped'}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {devServerRunning ? 'localhost:3000' : 'click to start'}
            </div>
          </button>
        </motion.div>

        {/* Suggested Actions */}
        {(suggestedActions.length > 0 || pendingDiffs > 0 || !devServerRunning) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mb-6"
          >
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
              Suggested Actions
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {pendingDiffs > 0 && (
                <Button
                  variant="outline"
                  className="h-9 justify-start gap-2 rounded-none font-mono text-xs"
                  onClick={onOpenDiffView}
                >
                  <IconDiff className="h-4 w-4 text-primary" weight="duotone" />
                  Review {pendingDiffs} pending diff{pendingDiffs !== 1 ? 's' : ''}
                </Button>
              )}
              {onStartAgent && (
                <Button
                  variant="outline"
                  className="h-9 justify-start gap-2 rounded-none font-mono text-xs"
                  onClick={onStartAgent}
                >
                  <IconQuickAction className="h-4 w-4 text-primary" weight="fill" />
                  Start new task
                </Button>
              )}
              {suggestedActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="h-9 justify-start gap-2 rounded-none font-mono text-xs"
                  onClick={action.action}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Files */}
        {recentFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
              Recent Files
            </h2>
            <div className="surface-1 border border-border">
              {recentFiles.map((file, idx) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => onOpenFile?.(file.path)}
                  className={`hover:bg-surface-2 flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                    idx > 0 ? 'border-t border-border' : ''
                  }`}
                >
                  <IconFile
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    weight="duotone"
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                    {file.path}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {file.timeAgo}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Keyboard shortcut hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="mt-8 text-center font-mono text-[10px] text-muted-foreground/50"
        >
          <kbd className="bg-muted px-1.5 py-0.5">Ctrl</kbd>+
          <kbd className="bg-muted px-1.5 py-0.5">K</kbd> command palette ·{' '}
          <kbd className="bg-muted px-1.5 py-0.5">Ctrl</kbd>+
          <kbd className="bg-muted px-1.5 py-0.5">I</kbd> composer
        </motion.div>
      </div>
    </div>
  )
}
