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
    <div className="rounded-none border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-900 dark:bg-yellow-950">
      <p className="font-mono font-medium text-yellow-900 dark:text-yellow-100">{label}</p>
      {detail && <p className="mt-0.5 text-yellow-800 dark:text-yellow-200">{detail}</p>}
      <div className="mt-2 flex gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-none bg-yellow-100 px-3 py-1 font-mono text-xs font-medium text-yellow-900 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-100"
          >
            Re-run
          </button>
        )}
        {onSwitchModel && (
          <button
            onClick={onSwitchModel}
            className="rounded-none bg-yellow-100 px-3 py-1 font-mono text-xs font-medium text-yellow-900 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-100"
          >
            Switch model
          </button>
        )}
        {onViewTranscript && (
          <button
            onClick={onViewTranscript}
            className="rounded-none bg-transparent px-3 py-1 font-mono text-xs font-medium text-yellow-700 hover:bg-yellow-100 dark:text-yellow-300"
          >
            View transcript
          </button>
        )}
      </div>
    </div>
  )
}
