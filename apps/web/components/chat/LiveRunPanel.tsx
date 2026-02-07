'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  describeStepMeta,
  formatElapsed,
  groupProgressSteps,
  reconcileProgressSteps,
  type LiveProgressStep,
} from './live-run-utils'

interface LiveRunPanelProps {
  steps: LiveProgressStep[]
  isStreaming: boolean
  onOpenFile?: (path: string) => void
  onOpenArtifacts?: () => void
}

const LIVE_RUN_OPEN_STORAGE_KEY = 'panda.liveRun.isOpen'

export function LiveRunPanel({
  steps,
  isStreaming,
  onOpenFile,
  onOpenArtifacts,
}: LiveRunPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasLoadedOpenPreference, setHasLoadedOpenPreference] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    analysis: true,
    rewrite: true,
    tool: true,
    complete: true,
    other: false,
  })
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!isStreaming) return
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [isStreaming])

  useEffect(() => {
    try {
      const persisted = window.localStorage.getItem(LIVE_RUN_OPEN_STORAGE_KEY)
      if (persisted === '1') setIsOpen(true)
      if (persisted === '0') setIsOpen(false)
    } catch {
      // Ignore storage access failures; keep default closed behavior.
    } finally {
      setHasLoadedOpenPreference(true)
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedOpenPreference) return
    try {
      window.localStorage.setItem(LIVE_RUN_OPEN_STORAGE_KEY, isOpen ? '1' : '0')
    } catch {
      // Ignore storage access failures.
    }
  }, [isOpen, hasLoadedOpenPreference])

  const visibleSteps = useMemo(() => steps.slice(-24), [steps])
  const reconciledSteps = useMemo(
    () => reconcileProgressSteps(visibleSteps, { isStreaming }),
    [visibleSteps, isStreaming]
  )
  const groups = useMemo(() => groupProgressSteps(reconciledSteps), [reconciledSteps])
  const startedAt = visibleSteps[0]?.createdAt ?? null
  const elapsedMs = startedAt ? Math.max(0, nowMs - startedAt) : 0

  if (!isStreaming && visibleSteps.length === 0) {
    return null
  }

  return (
    <div className="surface-2 border-b border-border px-3 py-2">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="mb-2 flex w-full items-center gap-2 text-left"
      >
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Live Run
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
          {startedAt ? formatElapsed(elapsedMs) : '0s'}
          {isStreaming ? ' • streaming' : ' • latest'}
        </span>
      </button>

      {!isOpen ? null : groups.length === 0 ? (
        <div className="font-mono text-xs text-muted-foreground">Preparing run...</div>
      ) : (
        <div className="space-y-1">
          {groups.map((group) => {
            const expanded = expandedGroups[group.key] ?? true
            const hasError = group.steps.some((step) => step.status === 'error')
            const hasRunning = group.steps.some((step) => step.status === 'running')
            const latestStatus = hasError ? 'error' : hasRunning ? 'running' : 'completed'
            return (
              <div key={group.key} className="border border-border bg-background/70">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-2 py-1 text-left font-mono text-[10px]"
                  onClick={() =>
                    setExpandedGroups((prev) => ({
                      ...prev,
                      [group.key]: !expanded,
                    }))
                  }
                >
                  {expanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <span>{group.label}</span>
                  <span className="ml-auto uppercase text-muted-foreground">{latestStatus}</span>
                </button>
                {expanded && (
                  <div className="space-y-1 border-t border-border px-2 py-1">
                    {group.steps.slice(-6).map((step) => (
                      <div
                        key={step.id}
                        className={cn(
                          'flex items-start gap-2 px-1 py-0.5 font-mono text-[10px]',
                          step.status === 'error' && 'text-destructive'
                        )}
                      >
                        {step.status === 'running' ? (
                          <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin" />
                        ) : step.status === 'error' ? (
                          <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
                        ) : (
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="leading-relaxed">{step.content}</div>
                          {(() => {
                            const meta = describeStepMeta(step)
                            return (
                              <>
                                {meta.primary ? (
                                  <div className="text-muted-foreground/80">{meta.primary}</div>
                                ) : null}
                                {meta.secondary ? (
                                  <div className="truncate text-muted-foreground/80">
                                    args: {meta.secondary}
                                  </div>
                                ) : null}
                                {meta.error ? (
                                  <div className="truncate text-destructive/90">{meta.error}</div>
                                ) : null}
                                {step.details?.targetFilePaths &&
                                step.details.targetFilePaths.length > 0 ? (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {step.details.targetFilePaths.slice(0, 2).map((path) => (
                                      <button
                                        key={`${step.id}-${path}`}
                                        type="button"
                                        onClick={() => onOpenFile?.(path)}
                                        className="border border-border px-1.5 py-0.5 text-[10px] hover:bg-muted/40"
                                      >
                                        open {path}
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                                {step.details?.hasArtifactTarget ? (
                                  <div className="mt-1">
                                    <button
                                      type="button"
                                      onClick={() => onOpenArtifacts?.()}
                                      className="border border-border px-1.5 py-0.5 text-[10px] hover:bg-muted/40"
                                    >
                                      open artifacts
                                    </button>
                                  </div>
                                ) : null}
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
