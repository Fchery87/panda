'use client'

interface BrowserSessionRecord {
  browserSessionKey: string
  status: 'ready' | 'stale' | 'leased' | 'failed'
  environment: string
  baseUrl: string
  lastRoutesTested: string[]
  leaseOwner?: string
  leaseExpiresAt?: number
  updatedAt: number
}

interface BrowserSessionPanelProps {
  session: BrowserSessionRecord | null
}

export function BrowserSessionPanel({ session }: BrowserSessionPanelProps) {
  if (!session) {
    return (
      <div className="surface-1 flex h-full flex-col border-l border-border">
        <div className="border-b border-border px-3 py-2">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Browser session
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-6">
          <div className="shadow-sharp-sm max-w-sm border border-dashed border-border bg-background px-4 py-5 text-center">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              No browser session
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Persistent QA session metadata will appear here once Forge opens a reusable browser.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="surface-1 flex h-full flex-col border-l border-border">
      <div className="border-b border-border px-3 py-2">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Browser session
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto px-3 py-3">
        <section className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
          <div className="flex flex-wrap gap-2">
            <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Status {session.status}
            </span>
            <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Env {session.environment}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="border border-border/70 px-2.5 py-2 font-mono text-xs">
              {session.browserSessionKey}
            </div>
            <div className="border border-border/70 px-2.5 py-2 text-sm text-muted-foreground">
              {session.baseUrl}
            </div>
          </div>
        </section>

        <section className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Route coverage
          </h4>
          <div className="mt-3 space-y-2">
            {session.lastRoutesTested.length === 0 ? (
              <div className="border border-dashed border-border/70 px-2.5 py-2 text-sm text-muted-foreground">
                No routes recorded yet.
              </div>
            ) : (
              session.lastRoutesTested.map((route) => (
                <div key={route} className="border border-border/70 px-2.5 py-2 font-mono text-xs">
                  {route}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <div className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
            <h4 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Lease owner
            </h4>
            <div className="mt-3 border border-border/70 px-2.5 py-2 text-sm text-muted-foreground">
              {session.leaseOwner ?? 'Unassigned'}
            </div>
          </div>
          <div className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
            <h4 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Lease expiry
            </h4>
            <div className="mt-3 border border-border/70 px-2.5 py-2 text-sm text-muted-foreground">
              {session.leaseExpiresAt ?? 'No active lease'}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
