'use client'

import { cn } from '@/lib/utils'

interface ModeToggleProps {
  mode: 'manual' | 'auto'
  onModeChange: (mode: 'manual' | 'auto') => void
  disabled?: boolean
}

export function ModeToggle({ mode, onModeChange, disabled }: ModeToggleProps) {
  return (
    <div className="relative flex border border-border bg-background">
      <div
        className={cn(
          'absolute inset-y-0 w-1/2 bg-primary transition-transform duration-150',
          mode === 'auto' ? 'translate-x-full' : 'translate-x-0'
        )}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onModeChange('manual')}
        className={cn(
          'relative z-10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors duration-150',
          mode === 'manual' ? 'text-primary-foreground' : 'text-muted-foreground'
        )}
      >
        Manual
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onModeChange('auto')}
        className={cn(
          'relative z-10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors duration-150',
          mode === 'auto' ? 'text-primary-foreground' : 'text-muted-foreground'
        )}
      >
        Auto
      </button>
    </div>
  )
}
