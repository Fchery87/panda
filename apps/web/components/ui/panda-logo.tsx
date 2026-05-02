'use client'

import { useId } from 'react'

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
  const reactId = useId()
  const glowId = `panda-circuit-glow-${reactId}`
  const clipId = `panda-face-clip-${reactId}`

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 1024 1024"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Panda"
        className={cn('shrink-0', monochrome && 'text-foreground')}
      >
        <defs>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 1  0 0.55 0 0 0.56  0 0 0 0 0  0 0 0 0.75 0"
            />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id={clipId}>
            <polygon points="512,173 258,300 185,563 263,735 409,793 454,858 570,858 615,793 761,735 839,563 766,300" />
          </clipPath>
        </defs>

        {/* Ears */}
        <polygon fill={palette.ink} points="190,282 312,210 430,338 327,419 246,398 190,337" />
        <polygon fill={palette.ink} points="834,282 712,210 594,338 697,419 778,398 834,337" />

        {/* Head outer border */}
        <polygon
          fill={palette.ink}
          points="512,146 246,280 158,563 240,765 377,823 448,896 576,896 647,823 784,765 866,563 778,280"
        />

        {/* Face halves */}
        <g clipPath={`url(#${clipId})`}>
          <rect x="160" y="145" width="352" height="760" fill={palette.faceLeft} />
          <rect x="512" y="145" width="352" height="760" fill={palette.faceRight} />
          <polygon
            fill={palette.faceHighlight}
            opacity={0.7}
            points="512,173 512,858 570,858 615,793 761,735 839,563 766,300"
          />
        </g>

        {/* Left eye patch */}
        <polygon
          fill={palette.ink}
          points="324,430 432,430 464,462 464,534 394,604 309,604 309,516"
        />

        {/* Right eye patch */}
        <polygon fill={palette.ink} points="560,430 668,430 715,478 715,604 630,604 560,534" />

        {/* Cheek / mouth black geometry */}
        <polygon
          fill={palette.ink}
          points="382,701 442,787 512,754 582,787 642,701 642,778 620,822 562,846 512,826 462,846 404,822 382,778"
        />
        <polygon fill={palette.ink} points="448,641 576,641 576,684 512,720 448,684" />

        {/* Lower muzzle cutouts */}
        <polygon fill={palette.muzzleLight} points="434,800 512,766 590,800 558,846 466,846" />
        <polygon fill={palette.faceRight} points="512,766 590,800 558,846 512,846" />

        {/* Nose stem */}
        <rect x="500" y="695" width="24" height="76" fill={palette.ink} />

        {/* Circuit glow underlay */}
        <g
          filter={`url(#${glowId})`}
          stroke={palette.accentGlow}
          strokeWidth="18"
          strokeLinecap="square"
          strokeLinejoin="miter"
          opacity={0.55}
          fill="none"
        >
          <path d="M526 365 H612 V540 L700 628 V686" />
          <path d="M661 323 V365 L728 432 L662 503 L724 565 H798" />
          <path d="M702 628 V736" />
        </g>

        {/* Circuit crisp lines */}
        <g
          stroke={palette.accent}
          strokeWidth="12"
          strokeLinecap="square"
          strokeLinejoin="miter"
          fill="none"
        >
          <path d="M526 365 H612 V540 L700 628 V686" />
          <path d="M661 323 V365 L728 432 L662 503 L724 565 H798" />
          <path d="M702 628 V736" />
        </g>
      </svg>

      {/* Text - only in full variant */}
      {variant === 'full' && (
        <span className={cn('font-sans font-semibold tracking-tight', textSize)}>
          panda<span className="text-primary">.ai</span>
        </span>
      )}
    </div>
  )
}
