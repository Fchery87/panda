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
      className={cn('relative flex rounded-none border-2 border-border bg-background', className)}
    >
      <div
        className={cn(
          'absolute inset-y-0 w-1/2 bg-primary transition-transform duration-150',
          level === 'autopilot' ? 'translate-x-full' : 'translate-x-0'
        )}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('review')}
        className={cn(
          'relative z-10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors duration-150',
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
          'relative z-10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors duration-150',
          level === 'autopilot' ? 'text-primary-foreground' : 'text-muted-foreground'
        )}
      >
        Autopilot
      </button>
    </div>
  )
}
