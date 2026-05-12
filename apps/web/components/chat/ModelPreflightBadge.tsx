import type { ModelPreflightSummary } from '@/lib/agent/providers/model-preflight'
import { cn } from '@/lib/utils'

interface ModelPreflightBadgeProps {
  preflight: ModelPreflightSummary
}

export function ModelPreflightBadge({ preflight }: ModelPreflightBadgeProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-2 border-t border-border px-2 py-1.5 font-mono text-[10px]',
        preflight.tone === 'ready'
          ? 'bg-background/60 text-muted-foreground'
          : 'bg-[oklch(var(--status-warning)/0.08)] text-foreground'
      )}
    >
      <span className="uppercase tracking-[0.18em] text-primary">Provider preflight</span>
      <span className="truncate">{preflight.modelLabel}</span>
      <span className="hidden sm:inline">{preflight.modeSupport}</span>
      <span className="hidden md:inline">{preflight.toolGrammar}</span>
      <span className="hidden lg:inline">{preflight.context}</span>
      <span className="hidden xl:inline">{preflight.cost}</span>
      <span className="hidden xl:inline">{preflight.reasoning}</span>
      {preflight.notes.length > 0 ? (
        <span className="hidden text-muted-foreground 2xl:inline">{preflight.notes.join(' ')}</span>
      ) : null}
    </div>
  )
}
