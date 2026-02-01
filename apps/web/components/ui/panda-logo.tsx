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
      {/* Angular Panda with Circuit Eye - Concept 1 Trace */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Left ear - solid black triangle */}
        <polygon points="15,25 30,10 38,28" fill="currentColor" className="text-foreground" />

        {/* Right ear - solid black triangle */}
        <polygon points="85,25 70,10 62,28" fill="currentColor" className="text-foreground" />

        {/* Main head shape - black border */}
        <path
          d="M18 35 L35 20 L65 20 L82 35 L85 55 L78 72 L65 82 L50 88 L35 82 L22 72 L15 55 Z"
          fill="currentColor"
          className="text-foreground"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="miter"
        />

        {/* Inner face - off-white/cream */}
        <path
          d="M22 37 L37 24 L63 24 L78 37 L80 54 L74 68 L62 77 L50 82 L38 77 L26 68 L20 54 Z"
          fill="currentColor"
          className="text-background"
        />

        {/* Left eye patch - black angular shape */}
        <path
          d="M28 38 L42 36 L46 48 L42 58 L30 56 L26 46 Z"
          fill="currentColor"
          className="text-foreground"
        />

        {/* Left eye - small white highlight */}
        <polygon
          points="34,44 40,43 41,49 37,52 32,50"
          fill="currentColor"
          className="text-background"
        />

        {/* Right eye area - where circuit goes */}
        {/* Circuit pattern - amber zigzag lines */}
        <path
          d="M58 36 L62 36 L66 42 L62 48"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="square"
          strokeLinejoin="miter"
          className="text-primary"
          fill="none"
        />
        <path
          d="M64 42 L72 42"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="square"
          className="text-primary"
          fill="none"
        />
        <path
          d="M66 48 L58 48 L54 54"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="square"
          strokeLinejoin="miter"
          className="text-primary"
          fill="none"
        />
        <path
          d="M58 48 L66 56"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="square"
          className="text-primary"
          fill="none"
        />

        {/* Circuit glow center - amber dot */}
        <circle cx="62" cy="48" r="3" fill="currentColor" className="text-primary" />

        {/* Nose - black pentagon */}
        <path
          d="M46 60 L54 60 L56 65 L50 70 L44 65 Z"
          fill="currentColor"
          className="text-foreground"
        />

        {/* Mouth/chin line - subtle */}
        <path d="M50 70 L50 75" stroke="currentColor" strokeWidth="2" className="text-foreground" />
        <path
          d="M42 76 L50 75 L58 76"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-foreground"
          fill="none"
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
