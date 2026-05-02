'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon as PandaIcon } from 'lucide-react'

export interface AdminSubNavItem {
  id: string
  label: string
  icon: PandaIcon
}

interface AdminSubNavProps {
  items: AdminSubNavItem[]
  activeId: string
  onSelect: (id: string) => void
}

export function AdminSubNav({ items, activeId, onSelect }: AdminSubNavProps) {
  return (
    <nav
      className="surface-1 w-52 shrink-0 border border-border p-3"
      aria-label="Section navigation"
    >
      <div className="mb-4 border-b border-border pb-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Admin navigation
        </div>
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeId === item.id
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-none border px-3 py-2 text-left font-mono text-sm transition-colors',
                isActive
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

interface AdminPageHeaderProps {
  icon: PandaIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function AdminPageHeader({ icon: Icon, title, description, action }: AdminPageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-start gap-3">
          <div className="surface-1 flex h-11 w-11 items-center justify-center border border-border">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Admin Console
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="max-w-2xl text-muted-foreground">{description}</p>
          </div>
        </div>
        {action}
      </div>
    </div>
  )
}
