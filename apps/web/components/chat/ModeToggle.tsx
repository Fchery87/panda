'use client'

import { OversightToggle } from './OversightToggle'

type ModeToggleProps = {
  mode: 'manual' | 'auto'
  onModeChange: (mode: 'manual' | 'auto') => void
  disabled?: boolean
  className?: string
}

export function ModeToggle({ mode, onModeChange, disabled, className }: ModeToggleProps) {
  return (
    <OversightToggle
      level={mode === 'auto' ? 'autopilot' : 'review'}
      onChange={(level) => onModeChange(level === 'autopilot' ? 'auto' : 'manual')}
      disabled={disabled}
      className={className}
    />
  )
}
