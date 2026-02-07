'use client'

import { cn } from '@/lib/utils'
import { resolvePandaLogoPalette } from './panda-logo.palette'

interface PandaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'icon' | 'full'
  monochrome?: boolean
  className?: string
}

const sizes = {
  sm: { icon: 24, text: 'text-sm' },
  md: { icon: 32, text: 'text-base' },
  lg: { icon: 40, text: 'text-lg' },
  xl: { icon: 56, text: 'text-xl' },
}

export function PandaLogo({
  size = 'md',
  variant = 'full',
  monochrome = false,
  className,
}: PandaLogoProps) {
  const { icon: iconSize, text: textSize } = sizes[size]
  const palette = resolvePandaLogoPalette(monochrome)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('shrink-0', monochrome && 'text-foreground')}
      >
        <path
          d="M110 160 L250 80 L390 160 L410 320 L250 430 L90 320 Z"
          fill={palette.baseFill}
          stroke={palette.ink}
          strokeWidth="12"
          strokeLinejoin="round"
        />
        <path d="M250 80 L390 160 L410 320 L250 430 V80Z" fill={palette.shadowFill} />
        <path
          d="M110 160 L80 120 L120 70 L180 80"
          fill={palette.ink}
          stroke={palette.ink}
          strokeWidth="8"
          strokeLinejoin="round"
        />
        <path
          d="M390 160 L420 120 L380 70 L320 80"
          fill={palette.ink}
          stroke={palette.ink}
          strokeWidth="8"
          strokeLinejoin="round"
        />
        <path d="M140 230 L220 215 L230 310 L160 330 Z" fill={palette.ink} />
        <path d="M270 215 L350 230 L330 330 L280 310 Z" fill={palette.ink} />
        <path d="M225 315 H275 L250 340 Z" fill={palette.ink} />
        <path
          d="M250 340 V370 M250 370 L210 385 M250 370 L290 385"
          fill="none"
          stroke={palette.ink}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g fill="none" stroke={palette.accent} strokeWidth="5" strokeLinecap="round">
          <circle cx="310" cy="180" r="5" fill={palette.accent} />
          <path d="M310 185 V220 L340 250" />
          <circle cx="340" cy="255" r="5" fill={palette.accent} />
          <path d="M270 240 L300 270 L300 310" />
          <circle cx="300" cy="315" r="5" fill={palette.accent} />
        </g>
      </svg>

      {/* Text - only in full variant */}
      {variant === 'full' && (
        <span className={cn('font-mono font-semibold tracking-tight', textSize)}>
          panda<span className="text-primary">.ai</span>
        </span>
      )}
    </div>
  )
}
