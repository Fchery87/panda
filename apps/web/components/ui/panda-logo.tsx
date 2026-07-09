'use client'

import { cn } from '@/lib/utils'

interface PandaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'icon' | 'full'
  monochrome?: boolean
  className?: string
}

const sizes = {
  sm: { icon: 'h-6 w-6 rounded-md text-[12px]', seal: 'h-1.5 w-1.5', text: 'text-sm' },
  md: { icon: 'h-8 w-8 rounded-lg text-base', seal: 'h-2 w-2', text: 'text-base' },
  lg: { icon: 'h-10 w-10 rounded-lg text-lg', seal: 'h-2.5 w-2.5', text: 'text-lg' },
  xl: { icon: 'h-14 w-14 rounded-xl text-2xl', seal: 'h-3 w-3', text: 'text-xl' },
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
          'relative grid shrink-0 place-items-center bg-primary font-display font-bold leading-none text-primary-foreground',
          selectedSize.icon,
          monochrome && 'bg-current text-background'
        )}
      >
        P
        {/* The panda's ink chop — a subtle seal in the corner */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute bottom-1 right-1 rounded-full bg-primary-foreground/40',
            selectedSize.seal
          )}
        />
      </span>

      {variant === 'full' && (
        <span className={cn('font-display font-semibold tracking-tight', selectedSize.text)}>
          panda<span className="text-oxblood">.ai</span>
        </span>
      )}
    </div>
  )
}
