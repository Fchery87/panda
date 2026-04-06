'use client'

import { cn } from '@/lib/utils'

type QaAssertion = {
  label: string
  status: 'passed' | 'failed' | 'skipped'
}

type QaReport = {
  decision: 'pass' | 'concerns' | 'fail'
  summary: string
  assertions: QaAssertion[]
  evidence: {
    urlsTested: string[]
    flowNames: string[]
    consoleErrors: string[]
    networkFailures: string[]
  }
  defects: Array<{
    severity: 'high' | 'medium' | 'low'
    title: string
    detail: string
  }>
}

interface QAPanelProps {
  report: QaReport | null
}

function assertionClassName(status: QaAssertion['status']): string {
  if (status === 'passed') return 'border-primary/50 bg-primary/5 text-primary'
  if (status === 'failed') return 'border-destructive/50 bg-destructive/5 text-destructive'
  return 'border-border bg-background/70 text-muted-foreground'
}

export function QAPanel({ report }: QAPanelProps) {
  if (!report) {
    return (
      <div className="surface-1 flex h-full flex-col border-l border-border">
        <div className="border-b border-border px-3 py-2">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            QA
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-6">
          <div className="shadow-sharp-sm max-w-sm border border-dashed border-border bg-background px-4 py-5 text-center">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              No QA report
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              QA evidence will appear here after review completes.
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
          QA
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto px-3 py-3">
        <section className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
          <div className="flex flex-wrap gap-2">
            <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Decision {report.decision}
            </span>
            <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Route count {report.evidence.urlsTested.length}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{report.summary}</p>
        </section>

        <section className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Routes tested
          </h4>
          <div className="mt-3 space-y-2">
            {report.evidence.urlsTested.map((url) => (
              <div key={url} className="border border-border/70 px-2.5 py-2 font-mono text-xs">
                {url}
              </div>
            ))}
          </div>
        </section>

        <section className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Assertions
          </h4>
          <div className="mt-3 space-y-2">
            {report.assertions.map((assertion) => (
              <div
                key={assertion.label}
                className="flex items-start justify-between gap-3 border border-border/70 px-2.5 py-2"
              >
                <span className="text-sm text-foreground">{assertion.label}</span>
                <span
                  className={cn(
                    'shrink-0 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em]',
                    assertionClassName(assertion.status)
                  )}
                >
                  {assertion.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          <div className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
            <h4 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Console
            </h4>
            <div className="mt-3 border border-border/70 px-2.5 py-2 text-sm text-muted-foreground">
              {report.evidence.consoleErrors.length === 0
                ? 'Console clean'
                : report.evidence.consoleErrors.join(', ')}
            </div>
          </div>
          <div className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3">
            <h4 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Network
            </h4>
            <div className="mt-3 border border-border/70 px-2.5 py-2 text-sm text-muted-foreground">
              {report.evidence.networkFailures.length === 0
                ? 'Network clean'
                : report.evidence.networkFailures.join(', ')}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
