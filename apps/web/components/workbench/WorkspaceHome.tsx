'use client'

import { motion } from 'framer-motion'
import {
  Diff as IconDiff,
  FileCode as IconFile,
  MessageSquarePlus as IconNewChat,
  Zap as IconQuickAction,
  Upload as IconUpload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { developmentCommands } from '@/lib/product/development-commands'
import { cn } from '@/lib/utils'
import { buildExecutionSessionTimelineRows } from '@/lib/workspace/execution-session-timeline'
import type { WorkspaceFocusState } from './workspace-focus'

interface WorkspaceHomeProps {
  focusState?: WorkspaceFocusState | null
  recentFiles?: Array<{ path: string; timeAgo: string }>
  pendingDiffs?: number
  activeAgents?: number
  problemCount?: number
  onOpenFile?: (path: string) => void
  onOpenDiffView?: () => void
  onStartAgent?: () => void
  onOpenTerminal?: () => void
  suggestedActions?: Array<{ label: string; action: () => void }>
  onFocusPrimaryAction?: () => void
  onFocusSecondaryAction?: () => void
}

const FOCUS_TONE_STYLES: Record<
  NonNullable<WorkspaceHomeProps['focusState']>['tone'],
  { badge: string; panel: string }
> = {
  neutral: {
    badge: 'border-border bg-background/70 text-muted-foreground',
    panel: 'border-border bg-background/80',
  },
  progress: {
    badge: 'border-primary/40 bg-primary/5 text-primary',
    panel: 'border-primary/20 bg-primary/5',
  },
  attention: {
    badge:
      'border-[oklch(var(--status-warning)/0.45)] bg-[oklch(var(--status-warning)/0.08)] text-[oklch(var(--status-warning))]',
    panel: 'border-[oklch(var(--status-warning)/0.2)] bg-[oklch(var(--status-warning)/0.05)]',
  },
  success: {
    badge:
      'border-[oklch(var(--status-success)/0.45)] bg-[oklch(var(--status-success)/0.08)] text-[oklch(var(--status-success))]',
    panel: 'border-[oklch(var(--status-success)/0.2)] bg-[oklch(var(--status-success)/0.05)]',
  },
}

const SIGNAL_TONE_STYLES: Record<NonNullable<WorkspaceHomeProps['focusState']>['tone'], string> = {
  neutral: 'border-border bg-background text-muted-foreground',
  progress: 'border-primary/40 bg-primary/5 text-primary',
  attention:
    'border-[oklch(var(--status-warning)/0.45)] bg-[oklch(var(--status-warning)/0.08)] text-[oklch(var(--status-warning))]',
  success:
    'border-[oklch(var(--status-success)/0.45)] bg-[oklch(var(--status-success)/0.08)] text-[oklch(var(--status-success))]',
}

const WORKSPACE_AREAS = [
  ['Session Thread', 'Intent → plan → execution'],
  ['Review Run', 'Run evidence, changes, context, preview'],
  ['Editor', 'Files, diffs, artifacts'],
  ['Runtime Dock', 'Terminal + execution bridge'],
]

const REVIEW_CHECKPOINTS = [
  'Confirm the plan matches the requested scope before Agent execution.',
  'Read validation evidence and receipts before accepting generated work.',
  'Inspect changed files and diffs from the Editor, not the chat transcript.',
  'Keep broad Convex queries bounded and redact command output before persistence.',
]

const FIRST_RUN_STEPS = [
  {
    label: '1. Project',
    detail: 'Open or create a project so files, memory, and runs stay together.',
  },
  {
    label: '2. Mode',
    detail: 'Choose Ask / Plan / Agent, then set Guided or Autopilot for implementation.',
  },
  {
    label: '3. Plan',
    detail: 'Review scope before execution when work needs structure.',
  },
  {
    label: '4. Run',
    detail: 'Watch run evidence, validation, receipts, and recovery state.',
  },
  {
    label: '5. Changes',
    detail: 'Inspect diffs and generated work before continuing.',
  },
  {
    label: '6. Next Action',
    detail: 'Resume, review, build, or start another session from one surface.',
  },
]

export function WorkspaceHome({
  focusState = null,
  recentFiles = [],
  pendingDiffs = 0,
  activeAgents = 0,
  problemCount = 0,
  onOpenFile,
  onOpenDiffView,
  onStartAgent,
  onOpenTerminal,
  suggestedActions = [],
  onFocusPrimaryAction,
  onFocusSecondaryAction,
}: WorkspaceHomeProps) {
  const focusTone = focusState ? FOCUS_TONE_STYLES[focusState.tone] : null
  const timelineRows = buildExecutionSessionTimelineRows(focusState?.executionSession ?? null)
  const scanSignals = focusState?.executionSession?.scanSignals ?? []
  const primarySummary = focusState
    ? focusState.detail
    : 'Direct the agent from the desk, inspect run evidence before accepting work, and open files only when implementation detail matters.'
  const workspaceVitals = [
    ['Recent files', recentFiles.length > 0 ? String(recentFiles.length) : 'Clean'],
    ['Pending diffs', String(pendingDiffs)],
    ['Active runs', String(activeAgents)],
    ['Problems', String(problemCount)],
  ]
  const quickActions: Array<{
    label: string
    icon: typeof IconFile
    onClick: () => void
  }> = []

  if (onOpenFile) {
    quickActions.push({
      label: 'Open Files',
      icon: IconFile,
      onClick: () => onOpenFile(''),
    })
  }

  if (onStartAgent) {
    quickActions.push({
      label: 'New Task',
      icon: IconNewChat,
      onClick: onStartAgent,
    })
  }

  if (onOpenTerminal) {
    quickActions.push({
      label: 'Runtime Dock',
      icon: IconUpload,
      onClick: onOpenTerminal,
    })
  }

  return (
    <div className="dot-grid scrollbar-thin h-full overflow-auto bg-background">
      <div className="px-3 py-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="shadow-sharp-md mb-4 border border-border bg-background"
        >
          <div className="bg-foreground/80 grid gap-px">
            <div className="space-y-2 bg-background p-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  Execution Session
                </span>
              </div>
              <h1 className="text-base font-bold tracking-tight text-foreground">
                {focusState
                  ? focusState.objective
                  : 'Run the workspace from intent, run evidence, and context.'}
              </h1>
              <p className="text-xs leading-relaxed text-muted-foreground">{primarySummary}</p>
              <div
                aria-label="Workspace vitals"
                className="grid grid-cols-2 gap-1.5 pt-1 md:grid-cols-4"
              >
                {workspaceVitals.map(([label, value]) => (
                  <div key={label} className="bg-card/70 border border-border px-2 py-1.5">
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                      {label}
                    </div>
                    <div className="font-mono text-sm font-semibold text-foreground">{value}</div>
                  </div>
                ))}
              </div>
              {scanSignals.length > 0 ? (
                <div
                  aria-label="Execution session at a glance"
                  className="grid grid-cols-2 gap-1.5 pt-1 md:grid-cols-4"
                >
                  {scanSignals.map((signal) => (
                    <div
                      key={signal.label}
                      className={cn('border px-2 py-1 font-mono', SIGNAL_TONE_STYLES[signal.tone])}
                    >
                      <div className="text-[9px] uppercase tracking-[0.18em] opacity-70">
                        {signal.label}
                      </div>
                      <div className="truncate text-[11px] font-semibold uppercase tracking-[0.12em]">
                        {signal.value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {quickActions.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {quickActions.map((action) => {
                    const Icon = action.icon
                    return (
                      <Button
                        key={action.label}
                        variant="outline"
                        className="h-8 justify-center gap-1.5 rounded-none font-mono text-[10px] leading-none"
                        onClick={action.onClick}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {action.label}
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className={cn('bg-background p-3', focusState && focusTone?.panel)}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Session State
                </span>
                <span
                  className={cn(
                    'border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]',
                    focusState && focusTone
                      ? focusTone.badge
                      : 'bg-background/70 border-border text-muted-foreground'
                  )}
                >
                  {focusState ? focusState.statusLabel : 'Idle'}
                </span>
              </div>
              <div className="mt-3 space-y-2 font-mono text-[11px] text-muted-foreground">
                <div className="flex items-center justify-between gap-4">
                  <span>Session changes</span>
                  <span className="text-foreground">{pendingDiffs}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Active runs</span>
                  <span className="text-foreground">{activeAgents}</span>
                </div>
                {focusState ? (
                  <div className="border-t border-border pt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Next: <span className="text-foreground">{focusState.nextStep}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>

        {focusState && focusTone ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.04 }}
            className={cn('mb-4 border p-3', focusTone.panel)}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                Next move
              </span>
              <span className="font-mono text-xs text-foreground">{focusState.nextStep}</span>
              <div className="ml-auto flex flex-wrap gap-1.5">
                {focusState.secondaryAction && onFocusSecondaryAction ? (
                  <Button
                    variant="outline"
                    className="h-7 rounded-none px-2.5 font-mono text-[10px] uppercase tracking-[0.2em]"
                    onClick={onFocusSecondaryAction}
                  >
                    {focusState.secondaryAction.label}
                  </Button>
                ) : null}
                {focusState.primaryAction && onFocusPrimaryAction ? (
                  <Button
                    className="h-7 rounded-none px-2.5 font-mono text-[10px] uppercase tracking-[0.2em]"
                    onClick={onFocusPrimaryAction}
                  >
                    {focusState.primaryAction.label}
                  </Button>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}

        {focusState?.executionSession ? (
          <motion.section
            aria-labelledby="resume-recovery-title"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.06 }}
            className="mb-4 border border-border bg-card"
          >
            <div className="border-b border-border bg-secondary px-3 py-2">
              <h2
                id="resume-recovery-title"
                className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary"
              >
                Resume And Recovery
              </h2>
            </div>
            <div className="grid gap-px bg-border md:grid-cols-2">
              {[
                ['Summary', focusState.executionSession.resume.summary],
                ['Checkpoint', focusState.executionSession.resume.checkpoint],
                ['Trace', focusState.executionSession.resume.trace],
                ['Run', focusState.executionSession.resume.proof],
                ['Branches', focusState.executionSession.resume.branches],
                ['Next', focusState.executionSession.resume.nextAction],
              ].map(([label, value]) => (
                <div key={label} className="bg-background p-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                    {label}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </motion.section>
        ) : null}

        {!focusState ? (
          <motion.section
            aria-labelledby="first-run-path-title"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.04 }}
            className="mb-4 border border-border bg-card"
          >
            <div className="border-b border-border bg-secondary px-3 py-2">
              <h2
                id="first-run-path-title"
                className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary"
              >
                First Run Path
              </h2>
            </div>
            <div className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-3">
              {FIRST_RUN_STEPS.map((step) => (
                <div key={step.label} className="bg-background p-3">
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground">
                    {step.label}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              ))}
            </div>
            {onStartAgent ? (
              <div className="border-t border-border bg-background p-3">
                <Button
                  className="h-8 rounded-none px-3 font-mono text-[10px] uppercase tracking-[0.2em]"
                  onClick={onStartAgent}
                >
                  Start first session
                </Button>
              </div>
            ) : null}
          </motion.section>
        ) : null}

        <motion.section
          aria-labelledby="workspace-map-title"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.07 }}
          className="mb-4 grid gap-4 xl:grid-cols-2"
        >
          <div className="border border-border bg-card">
            <div className="border-b border-border bg-secondary px-3 py-2">
              <h2
                id="workspace-map-title"
                className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary"
              >
                Workspace Map
              </h2>
            </div>
            <div className="grid gap-px bg-border md:grid-cols-2">
              {WORKSPACE_AREAS.map(([area, signal]) => (
                <div key={area} className="bg-background p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground">
                    {area}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{signal}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-border bg-card">
            <div className="border-b border-border bg-secondary px-3 py-2">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                Review Checklist
              </h2>
            </div>
            <div className="divide-y divide-border">
              {REVIEW_CHECKPOINTS.map((item) => (
                <p
                  key={item}
                  className="bg-background p-3 text-xs leading-relaxed text-muted-foreground"
                >
                  {item}
                </p>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          aria-labelledby="command-deck-title"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.075 }}
          className="mb-4 border border-border bg-card"
        >
          <div className="border-b border-border bg-secondary px-3 py-2">
            <h2
              id="command-deck-title"
              className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary"
            >
              Important Commands
            </h2>
          </div>
          <div className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-4">
            {developmentCommands.map((item) => (
              <div key={item.command} className="bg-background p-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground">
                  {item.label}
                </div>
                <code className="mt-1 block truncate border border-border bg-card px-2 py-1 font-mono text-[10px] text-primary">
                  {item.command}
                </code>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
          className="mb-4 border border-border bg-card"
        >
          <div className="border-b border-border bg-secondary px-3 py-2">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
              Session Timeline
            </h2>
          </div>
          <div className="divide-y divide-border">
            {timelineRows.map((row) => (
              <div key={row.id} className="px-3 py-2">
                <div className="mb-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  {row.title}
                </div>
                <p className="text-xs leading-relaxed text-foreground">{row.summary}</p>
                {row.detailRef ? (
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                    Detail: {row.detailRef.kind}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-primary/10 mb-4 border border-primary p-3"
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                Session Composer
              </div>
            </div>
            {onStartAgent ? (
              <Button
                className="h-8 shrink-0 rounded-none px-3 font-mono text-[10px] uppercase tracking-[0.2em]"
                onClick={onStartAgent}
              >
                Continue Session
              </Button>
            ) : null}
          </div>
        </motion.div>

        {(suggestedActions.length > 0 || pendingDiffs > 0 || onStartAgent) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mb-4"
          >
            <div className="grid grid-cols-2 gap-1.5">
              {pendingDiffs > 0 && (
                <Button
                  variant="outline"
                  className="h-8 justify-start gap-1.5 rounded-none font-mono text-[10px]"
                  onClick={onOpenDiffView}
                >
                  <IconDiff className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">
                    {pendingDiffs} diff{pendingDiffs !== 1 ? 's' : ''}
                  </span>
                </Button>
              )}
              {onStartAgent && (
                <Button
                  variant="outline"
                  className="h-8 justify-start gap-1.5 rounded-none font-mono text-[10px]"
                  onClick={onStartAgent}
                >
                  <IconQuickAction className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">New session</span>
                </Button>
              )}
              {suggestedActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="h-8 justify-start gap-1.5 rounded-none font-mono text-[10px]"
                  onClick={action.action}
                >
                  <span className="truncate">{action.label}</span>
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {recentFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
              Recent Files
            </h2>
            <div className="surface-1 border border-border">
              {recentFiles.map((file, idx) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => onOpenFile?.(file.path)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-2 ${
                    idx > 0 ? 'border-t border-border' : ''
                  }`}
                >
                  <IconFile className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-foreground">
                    {file.path}
                  </span>
                  <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                    {file.timeAgo}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
