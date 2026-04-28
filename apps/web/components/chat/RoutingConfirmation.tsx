'use client'

import type { ExecutionReceipt } from '@/lib/agent/receipt'
import type { ChatMode } from '@/lib/agent/prompt-library'

interface RoutingConfirmationProps {
  receipt: ExecutionReceipt
  onAccept?: () => void
  onOverride?: (mode: ChatMode) => void
}

const CONFIDENCE_STYLES: Record<string, string> = {
  low: 'border-[hsl(var(--status-warning))]/40 bg-[hsl(var(--status-warning))]/5',
  medium: 'border-[hsl(var(--status-info))]/40 bg-[hsl(var(--status-info))]/5',
  high: '',
}

export function RoutingConfirmation({ receipt, onAccept, onOverride }: RoutingConfirmationProps) {
  const decision = receipt.routingDecision
  if (decision.confidence === 'high') return null

  const style = CONFIDENCE_STYLES[decision.confidence] ?? ''

  return (
    <div className={`state-band border border-border px-3 py-2 ${style}`} data-state="blocked">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>
              Routed {decision.requestedMode} → {decision.resolvedMode}
            </span>
            <span className="font-semibold">{decision.confidence} confidence</span>
          </div>
          {decision.rationale ? (
            <p className="mt-1 font-mono text-xs leading-relaxed text-muted-foreground">
              {decision.rationale}
            </p>
          ) : null}
        </div>
      </div>
      {onAccept || onOverride ? (
        <div className="mt-2 flex items-center gap-2">
          {onAccept ? (
            <button
              type="button"
              onClick={onAccept}
              className="hover:bg-surface-2 border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors"
            >
              Accept
            </button>
          ) : null}
          {onOverride ? (
            <button
              type="button"
              onClick={() => onOverride(decision.requestedMode)}
              className="border border-primary/40 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/5"
            >
              Override
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
