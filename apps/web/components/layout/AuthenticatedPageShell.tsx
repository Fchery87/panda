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
}: AuthenticatedPageShellProps) {
  return (
    <section className={cn('px-3 pb-12 pt-5 sm:px-5 lg:px-8', className)}>
      <div className="bg-background/92 shadow-sharp-lg mx-auto max-w-[1500px] border border-foreground">
        <header className="bg-card/95 grid border-b border-foreground lg:grid-cols-[minmax(240px,0.34fr)_1fr_auto]">
          <div className="flex items-center gap-3 border-b border-foreground px-5 py-5 lg:border-b-0 lg:border-r">
            <div className="relative grid h-9 w-9 shrink-0 place-items-center bg-foreground font-mono text-sm font-bold text-background">
              P
              <span className="absolute right-[-5px] top-2 h-2.5 w-2.5 border border-foreground bg-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Panda.ai
              </p>
              <h1 className="truncate text-2xl font-bold leading-none tracking-tight">{title}</h1>
            </div>
          </div>

          <div className="grid content-center gap-1 border-b border-foreground px-5 py-5 lg:border-b-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              {eyebrow}
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>

          <div className="flex items-center gap-3 px-5 py-4 lg:border-l lg:border-foreground">
            {status ? (
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {status}
              </div>
            ) : null}
            {action}
          </div>
        </header>

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
    <div className="grid border-b border-foreground bg-card sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            'flex min-h-11 items-center justify-between border-b border-foreground px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:border-r lg:border-b-0',
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
