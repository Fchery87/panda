'use client'

import { cn } from '@/lib/utils'

type GateStatus = 'not_required' | 'pending' | 'passed' | 'failed' | 'waived'

interface StatePanelState {
  currentPhase: string
  openTaskCount: number
  unresolvedRiskCount: number
  reviewGateStatus: GateStatus
  qaGateStatus: GateStatus
  shipSummary: string
}

interface StatePanelProps {
  state: StatePanelState | null
}

function gateClassName(status: GateStatus): string {
  if (status === 'passed') return 'border-primary/50 bg-primary/5 text-primary'
  if (status === 'failed') return 'border-destructive/50 bg-destructive/5 text-destructive'
  if (status === 'pending') return 'border-warning/50 bg-warning/5 text-warning'
  if (status === 'waived') return 'border-border bg-muted/50 text-muted-foreground'
  return 'border-border bg-background/70 text-muted-foreground'
}

export function StatePanel({ state }: StatePanelProps) {
  if (!state) {
    return (
      <div className="surface-1 flex h-full flex-col border-l border-border">
        <div className="border-b border-border px-3 py-2">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            State
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-6">
          <div className="shadow-sharp-sm max-w-sm border border-dashed border-border bg-background px-4 py-5 text-center">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              No delivery state
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Tracked project state will appear here when structured delivery activates.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="surface-1 flex h-full flex-col border-l border-border">
      <div className="border-b border-border px-3 py-2">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          State
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto px-3 py-3">
        <section className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
          <div className="flex flex-wrap gap-2">
            <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Phase {state.currentPhase}
            </span>
            <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Open tasks {state.openTaskCount}
            </span>
            <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Risks {state.unresolvedRiskCount}
            </span>
          </div>
        </section>

        <section className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Gates
          </h4>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={cn(
                'shadow-sharp-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em]',
                gateClassName(state.reviewGateStatus)
              )}
            >
              Review {state.reviewGateStatus}
            </span>
            <span
              className={cn(
                'shadow-sharp-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em]',
                gateClassName(state.qaGateStatus)
              )}
            >
              QA {state.qaGateStatus}
            </span>
          </div>
        </section>

        <section className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Ship readiness
          </h4>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{state.shipSummary}</p>
        </section>
      </div>
    </div>
  )
}
