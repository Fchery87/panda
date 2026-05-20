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
    <section className={cn('px-3 pb-12 pt-5 sm:px-5 lg:px-8', className)}>
      <div className="bg-background/92 shadow-sharp-lg mx-auto max-w-[1500px] border border-border">
        {!hideHeader && (
          <header className="bg-card/95 flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                {eyebrow}
              </p>
              <h1 className="mt-0.5 truncate text-xl font-bold leading-tight tracking-tight text-foreground">
                {title}
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
            {status || action ? (
              <div className="flex shrink-0 items-center gap-3 pt-1">
                {status ? (
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {status}
                  </div>
                ) : null}
                {action}
              </div>
            ) : null}
          </header>
        )}

        {subHeader}

        <div
          className={cn(
            'bg-foreground/80 grid gap-px',
            sidebar ? 'lg:grid-cols-[260px_minmax(0,1fr)]' : 'grid-cols-1'
          )}
        >
          {sidebar ? <aside className="bg-card p-3 sm:p-5">{sidebar}</aside> : null}
          <div className={cn('bg-background p-5 sm:p-7 lg:p-9', contentClassName)}>{children}</div>
        </div>
      </div>
    </section>
  )
}

interface AuthenticatedModeStripProps {
  items: Array<{ label: string; value: string; active?: boolean }>
}

export function AuthenticatedModeStrip({ items }: AuthenticatedModeStripProps) {
  return (
    <div className="grid border-b border-border bg-card sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            'flex min-h-11 items-center justify-between border-b border-border px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:border-r lg:border-b-0',
            item.active && 'bg-primary/10 text-foreground',
            index === items.length - 1 && 'sm:border-r-0'
          )}
        >
          <span>{item.label}</span>
          <span className={item.active ? 'text-primary' : 'text-muted-foreground'}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
