'use client'

import { cn } from '@/lib/utils'

interface PandaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'icon' | 'full'
  className?: string
}

const sizes = {
  sm: { icon: 24, text: 'text-sm' },
  md: { icon: 32, text: 'text-base' },
  lg: { icon: 40, text: 'text-lg' },
  xl: { icon: 56, text: 'text-xl' },
}

export function PandaLogo({ size = 'md', variant = 'full', className }: PandaLogoProps) {
  const { icon: iconSize, text: textSize } = sizes[size]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <filter id="circuit-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ears */}
        <polygon
          points="90,110 160,75 198,120 120,160 90,132"
          fill="currentColor"
          className="text-foreground"
        />
        <polygon
          points="422,110 352,75 314,120 392,160 422,132"
          fill="currentColor"
          className="text-foreground"
        />

        {/* Outer contour */}
        <path
          d="M88 132 L194 84 L256 112 L318 84 L424 132 L428 208 L390 320 L334 364 L282 382 L230 382 L178 364 L122 320 L84 208 Z"
          fill="currentColor"
          className="text-foreground"
        />

        {/* Inner face halves */}
        <path
          d="M122 155 L198 118 L256 141 L256 329 L214 329 L214 357 L174 330 L134 298 L103 208 Z"
          fill="#f2efe7"
        />
        <path
          d="M390 155 L314 118 L256 141 L256 329 L298 329 L298 357 L338 330 L378 298 L409 208 Z"
          fill="#ebe7de"
        />

        {/* Eye patches */}
        <polygon
          points="160,168 232,168 232,252 194,286 126,286 126,201"
          fill="currentColor"
          className="text-foreground"
        />
        <polygon
          points="280,168 352,168 352,252 318,286 280,286 280,252"
          fill="currentColor"
          className="text-foreground"
        />

        {/* Nose / muzzle */}
        <polygon
          points="222,330 290,330 290,351 256,364 222,351"
          fill="currentColor"
          className="text-foreground"
        />
        <polygon
          points="224,365 288,365 271,386 241,386"
          fill="currentColor"
          className="text-foreground"
        />
        <path
          d="M256 364 L256 386"
          stroke="currentColor"
          strokeWidth="8"
          className="text-foreground"
        />

        {/* Circuit eye */}
        <g
          stroke="currentColor"
          className="text-primary"
          strokeWidth="6"
          strokeLinecap="square"
          fill="none"
        >
          <path d="M264 142 L298 142 L298 194" />
          <path d="M320 158 L320 188 L350 218 L320 248 L350 278 L394 278" />
          <path d="M298 194 L298 248 L336 286" />
          <path d="M298 248 L340 248" />
          <path d="M330 278 L330 314" />
        </g>
        <circle
          cx="305"
          cy="248"
          r="12"
          fill="currentColor"
          className="text-primary"
          filter="url(#circuit-glow)"
        />
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
