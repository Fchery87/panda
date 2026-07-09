import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface AuthenticatedPageShellProps {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
  status?: ReactNode
  subHeader?: ReactNode
  sidebar?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  hideHeader?: boolean
}

export function AuthenticatedPageShell({
  eyebrow,
  title,
  description,
  action,
  status,
  subHeader,
  sidebar,
  children,
  className,
  contentClassName,
  hideHeader = false,
}: AuthenticatedPageShellProps) {
  return (
    <section className={cn('mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 lg:pt-14', className)}>
      {!hideHeader && (
        <header className="flex flex-col justify-between gap-6 pb-8 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p className="text-sm font-medium text-oxblood">{eyebrow}</p>
            <h1 className="font-display mt-2 truncate text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          {status || action ? (
            <div className="flex shrink-0 items-center gap-4">
              {status ? <div className="text-sm text-muted-foreground">{status}</div> : null}
              {action}
            </div>
          ) : null}
        </header>
      )}

      {subHeader}

      <div
        className={cn('grid gap-8', sidebar ? 'lg:grid-cols-[260px_minmax(0,1fr)]' : 'grid-cols-1')}
      >
        {sidebar ? <aside>{sidebar}</aside> : null}
        <div className={cn('min-w-0', contentClassName)}>{children}</div>
      </div>
    </section>
  )
}

interface AuthenticatedModeStripProps {
  items: Array<{ label: string; value: string; active?: boolean }>
}

export function AuthenticatedModeStrip({ items }: AuthenticatedModeStripProps) {
  return (
    <div className="mb-8 flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm',
            item.active
              ? 'bg-oxblood/25 font-medium text-foreground'
              : 'bg-secondary text-muted-foreground'
          )}
        >
          <span>{item.label}</span>
          <span className={cn('text-xs', item.active ? 'text-oxblood' : 'text-muted-foreground')}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
