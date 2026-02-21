'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ModelVariant } from '@/lib/llm/types'

interface VariantSelectorProps {
  variants?: ModelVariant[]
  currentVariant?: string
  onVariantChange: (variantId: string) => void
  className?: string
}

const DEFAULT_VARIANTS: ModelVariant[] = [
  { id: 'none', name: 'None', options: {} },
  { id: 'low', name: 'Low', options: { reasoningEffort: 'low' } },
  { id: 'medium', name: 'Medium', options: { reasoningEffort: 'medium' } },
  { id: 'high', name: 'High', options: { reasoningEffort: 'high' } },
  { id: 'max', name: 'Max', options: { reasoningEffort: 'max' } },
]

export function VariantSelector({
  variants = DEFAULT_VARIANTS,
  currentVariant = 'none',
  onVariantChange,
  className,
}: VariantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const currentVariantName = variants.find((v) => v.id === currentVariant)?.name || 'None'

  const handleSelect = (variantId: string) => {
    onVariantChange(variantId)
    setIsOpen(false)
  }

  const cycleVariant = () => {
    const currentIndex = variants.findIndex((v) => v.id === currentVariant)
    const nextIndex = (currentIndex + 1) % variants.length
    onVariantChange(variants[nextIndex].id)
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        onDoubleClick={cycleVariant}
        variant="outline"
        size="sm"
        className="rounded-none font-mono text-xs"
      >
        {currentVariantName}
      </Button>

      {isOpen && (
        <div className="shadow-sharp-md absolute left-0 top-full z-50 mt-1 min-w-[120px] border border-border bg-background">
          {variants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => handleSelect(variant.id)}
              className={cn(
                'w-full px-3 py-2 text-left font-mono text-xs transition-colors hover:bg-muted',
                currentVariant === variant.id && 'bg-muted'
              )}
            >
              {variant.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
