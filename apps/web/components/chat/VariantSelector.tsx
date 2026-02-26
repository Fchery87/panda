'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown } from 'lucide-react'
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
  const currentVariantName = variants.find((v) => v.id === currentVariant)?.name || 'None'

  const cycleVariant = () => {
    const currentIndex = variants.findIndex((v) => v.id === currentVariant)
    const nextIndex = (currentIndex + 1) % variants.length
    onVariantChange(variants[nextIndex].id)
  }

  return (
    <SelectPrimitive.Root value={currentVariant} onValueChange={onVariantChange}>
      <SelectPrimitive.Trigger
        onDoubleClick={cycleVariant}
        className={cn(
          'flex h-8 items-center justify-between gap-1.5 border border-border bg-background px-2 py-1',
          'rounded-none font-mono text-xs text-foreground',
          'hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring',
          'min-w-[120px]',
          '[&>span]:line-clamp-1',
          className
        )}
      >
        <SelectPrimitive.Value>{currentVariantName}</SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          align="end"
          sideOffset={4}
          collisionPadding={8}
          className={cn(
            'relative z-50 min-w-[120px] max-w-[calc(100vw-1rem)] overflow-hidden',
            'rounded-none border border-border bg-popover text-popover-foreground shadow-md',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
            'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1'
          )}
        >
          <SelectPrimitive.Viewport className="max-h-[min(14rem,45vh)] p-1">
          {variants.map((variant) => (
            <SelectPrimitive.Item
              key={variant.id}
              value={variant.id}
              className={cn(
                'relative flex w-full cursor-default select-none items-center rounded-none px-3 py-2',
                'font-mono text-xs outline-none focus:bg-accent focus:text-accent-foreground',
                'truncate',
                currentVariant === variant.id && 'bg-muted'
              )}
            >
              <SelectPrimitive.ItemText>{variant.name}</SelectPrimitive.ItemText>
            </SelectPrimitive.Item>
          ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
