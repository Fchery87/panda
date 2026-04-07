'use client'

interface DecisionRecord {
  summary: string
  category: 'architecture' | 'execution' | 'risk' | 'qa' | 'ship'
  relatedFilePaths: string[]
  createdByRole: 'builder' | 'manager' | 'executive'
}

interface DecisionPanelProps {
  decisions: DecisionRecord[]
}

export function DecisionPanel({ decisions }: DecisionPanelProps) {
  if (decisions.length === 0) {
    return (
      <div className="surface-1 flex h-full flex-col border-l border-border">
        <div className="border-b border-border px-3 py-2">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Decisions
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-6">
          <div className="shadow-sharp-sm max-w-sm border border-dashed border-border bg-background px-4 py-5 text-center">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              No decisions logged
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="surface-1 flex h-full flex-col border-l border-border">
      <div className="border-b border-border px-3 py-2">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Decisions
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto px-3 py-3">
        {decisions.map((decision, index) => (
          <section
            key={`${decision.summary}-${index}`}
            className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3"
          >
            <div className="flex flex-wrap gap-2">
              <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {decision.category}
              </span>
              <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {decision.createdByRole}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground">{decision.summary}</p>
            <div className="mt-3 space-y-2">
              {decision.relatedFilePaths.length === 0 ? (
                <div className="border border-dashed border-border/70 px-2.5 py-2 text-sm text-muted-foreground">
                  No related files linked.
                </div>
              ) : (
                decision.relatedFilePaths.map((filePath) => (
                  <div
                    key={filePath}
                    className="border border-border/70 px-2.5 py-2 font-mono text-xs"
                  >
                    {filePath}
                  </div>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
