'use client'

import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeliveryPhase, DeliveryRole, GateStatus } from '@/lib/delivery/types'

interface DeliveryStatusStripProps {
  currentPhase: DeliveryPhase | null
  activeRole: DeliveryRole | null
  currentTaskTitle: string | null
  reviewGateStatus: GateStatus
  qaGateStatus: GateStatus
  shipGateStatus: GateStatus
  evidenceMissing: boolean
}

function gateClassName(status: GateStatus): string {
  if (status === 'passed') return 'border-primary/50 bg-primary/5 text-primary'
  if (status === 'failed') return 'border-destructive/50 bg-destructive/5 text-destructive'
  if (status === 'pending') return 'border-warning/50 bg-warning/5 text-warning'
  if (status === 'waived') return 'border-border bg-muted/50 text-muted-foreground'
  return 'border-border bg-background/70 text-muted-foreground'
}

export function DeliveryStatusStrip({
  currentPhase,
  activeRole,
  currentTaskTitle,
  reviewGateStatus,
  qaGateStatus,
  shipGateStatus,
  evidenceMissing,
}: DeliveryStatusStripProps) {
  if (!currentPhase && !activeRole && !currentTaskTitle) {
    return null
  }

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      {currentPhase ? (
        <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Phase {currentPhase}
        </span>
      ) : null}
      {activeRole ? (
        <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Role {activeRole}
        </span>
      ) : null}
      {currentTaskTitle ? (
        <span className="shadow-sharp-sm max-w-full border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground [overflow-wrap:anywhere]">
          Task {currentTaskTitle}
        </span>
      ) : null}
      <span
        className={cn(
          'shadow-sharp-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em]',
          gateClassName(reviewGateStatus)
        )}
      >
        Review {reviewGateStatus}
      </span>
      <span
        className={cn(
          'shadow-sharp-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em]',
          gateClassName(qaGateStatus)
        )}
      >
        QA {qaGateStatus}
      </span>
      {shipGateStatus !== 'not_required' ? (
        <span
          className={cn(
            'shadow-sharp-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em]',
            gateClassName(shipGateStatus)
          )}
        >
          Ship {shipGateStatus}
        </span>
      ) : null}
      {evidenceMissing ? (
        <span className="shadow-sharp-sm inline-flex items-center gap-1 border border-warning/50 bg-warning/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-warning">
          <AlertTriangle className="h-3 w-3" />
          Evidence missing
        </span>
      ) : null}
    </div>
  )
}
