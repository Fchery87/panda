'use client'

import type { TerminationReason } from '@/lib/agent/harness/errors'

interface Props {
  reason: TerminationReason
  onRetry?: () => void
  onSwitchModel?: () => void
  onViewTranscript?: () => void
}

const LABELS: Record<TerminationReason['kind'], string> = {
  completed: 'Completed',
  'user-abort': 'Stopped',
  'step-budget-exhausted': 'Step limit reached',
  'stream-idle': 'Connection timed out',
  'no-tool-calls-in-build-mode': 'Narration loop detected',
  'network-timeout': 'Network timeout',
  'preflight-failed': 'Cannot start',
  'tool-call-leak-detected': 'Grammar leak aborted',
}

const DETAILS: Partial<Record<TerminationReason['kind'], (r: TerminationReason) => string>> = {
  'step-budget-exhausted': (r) => `Reached the ${(r as { budget: number }).budget}-step limit.`,
  'stream-idle': (r) => `No response for ${Math.round((r as { idleMs: number }).idleMs / 1000)}s.`,
  'no-tool-calls-in-build-mode': (r) =>
    `Agent narrated for ${(r as { narrationTurns: number }).narrationTurns} turns without calling a tool. Try switching to a verified model or re-stating the task.`,
  'preflight-failed': (r) => `Pre-flight check failed: ${(r as { code: string }).code}`,
  'network-timeout': (r) => `Network error: ${(r as { cause: string }).cause}`,
}

export function RunStatus({ reason, onRetry, onSwitchModel, onViewTranscript }: Props) {
  if (reason.kind === 'completed') return null

  const label = LABELS[reason.kind] ?? 'Unknown issue'
  const detail = DETAILS[reason.kind]?.(reason)

  return (
    <div className="border border-warning/30 bg-warning/10 p-3 text-sm">
      <p className="font-mono font-medium text-foreground">{label}</p>
      {detail && <p className="mt-0.5 text-muted-foreground">{detail}</p>}
      <div className="mt-2 flex gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-warning/15 px-3 py-1 font-mono text-xs font-medium text-foreground hover:bg-warning/25"
          >
            Re-run
          </button>
        )}
        {onSwitchModel && (
          <button
            onClick={onSwitchModel}
            className="bg-warning/15 px-3 py-1 font-mono text-xs font-medium text-foreground hover:bg-warning/25"
          >
            Switch model
          </button>
        )}
        {onViewTranscript && (
          <button
            onClick={onViewTranscript}
            className="bg-transparent px-3 py-1 font-mono text-xs font-medium text-foreground hover:bg-warning/15"
          >
            View transcript
          </button>
        )}
      </div>
    </div>
  )
}
