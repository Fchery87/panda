'use client'

import { cn } from '@/lib/utils'

interface OversightToggleProps {
  level: 'review' | 'autopilot'
  onChange: (level: 'review' | 'autopilot') => void
  disabled?: boolean
  className?: string
}

export function OversightToggle({ level, onChange, disabled, className }: OversightToggleProps) {
  return (
    <div
      className={cn(
        'relative flex h-6 items-center gap-1 rounded-none border border-border bg-background p-0.5',
        className
      )}
    >
      <div
        className={cn(
          'absolute inset-y-0.5 left-0.5 w-[calc(50%-0.25rem)] bg-primary transition-transform duration-150',
          level === 'autopilot' ? 'translate-x-full' : 'translate-x-0'
        )}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('review')}
        className={cn(
          'relative z-10 flex h-5 min-w-16 items-center justify-center px-3 font-mono text-[10px] leading-none uppercase tracking-widest transition-colors duration-150',
          'disabled:pointer-events-none disabled:opacity-50',
          level === 'review' ? 'text-primary-foreground' : 'text-muted-foreground'
        )}
      >
        Review
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('autopilot')}
        className={cn(
          'relative z-10 flex h-5 min-w-16 items-center justify-center px-3 font-mono text-[10px] leading-none uppercase tracking-widest transition-colors duration-150',
          'disabled:pointer-events-none disabled:opacity-50',
          level === 'autopilot' ? 'text-primary-foreground' : 'text-muted-foreground'
        )}
      >
        Autopilot
      </button>
    </div>
  )
}
