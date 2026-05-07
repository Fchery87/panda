'use client'

import { cn } from '@/lib/utils'

interface PandaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'icon' | 'full'
  monochrome?: boolean
  className?: string
}

const sizes = {
  sm: { icon: 'h-6 w-6 text-[11px]', text: 'text-sm' },
  md: { icon: 'h-8 w-8 text-sm', text: 'text-base' },
  lg: { icon: 'h-10 w-10 text-base', text: 'text-lg' },
  xl: { icon: 'h-14 w-14 text-xl', text: 'text-xl' },
}

export function PandaLogo({
  size = 'md',
  variant = 'full',
  monochrome = false,
  className,
}: PandaLogoProps) {
  const selectedSize = sizes[size]

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        aria-label="Panda"
        role="img"
        className={cn(
          'relative grid shrink-0 place-items-center bg-foreground font-mono font-bold leading-none text-background',
          selectedSize.icon,
          monochrome && 'bg-current text-background'
        )}
      >
        P
        <span
          aria-hidden="true"
          className="absolute right-[-5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 border border-foreground bg-primary"
        />
      </span>

      {variant === 'full' && (
        <span className={cn('font-sans font-semibold tracking-tight', selectedSize.text)}>
          panda<span className="text-primary">.ai</span>
        </span>
      )}
    </div>
  )
}
