'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export interface AdminSubNavItem {
  id: string
  label: string
  icon: LucideIcon
}

interface AdminSubNavProps {
  items: AdminSubNavItem[]
  activeId: string
  onSelect: (id: string) => void
}

export function AdminSubNav({ items, activeId, onSelect }: AdminSubNavProps) {
  return (
    <nav className="w-44 shrink-0 space-y-1" aria-label="Section navigation">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = activeId === item.id
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              'flex w-full items-center gap-2 rounded-none border-l-2 px-3 py-2 text-left font-mono text-sm transition-colors',
              isActive
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

interface AdminPageHeaderProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function AdminPageHeader({ icon: Icon, title, description, action }: AdminPageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="h-7 w-7" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>
        {action}
      </div>
    </div>
  )
}
