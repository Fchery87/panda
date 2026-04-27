import type { ExecutionReceipt } from '@/lib/agent/receipt'
import { cn } from '@/lib/utils'

interface RunReceiptPanelProps {
  receipt?: ExecutionReceipt | null
}

function modeLabel(receipt: ExecutionReceipt): string {
  return `${receipt.requestedMode} -> ${receipt.resolvedMode}`
}

function ReceiptMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border bg-background/80 px-2 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-xs text-foreground [overflow-wrap:anywhere]">{value}</div>
    </div>
  )
}

function ReceiptSection({
  title,
  children,
  tone = 'default',
}: {
  title: string
  children: React.ReactNode
  tone?: 'default' | 'primary'
}) {
  return (
    <section
      className={cn(
        'shadow-sharp-sm border bg-background/85 px-3 py-2',
        tone === 'primary' ? 'border-primary/45' : 'border-border'
      )}
    >
      <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h4>
      <div className="mt-2">{children}</div>
    </section>
  )
}

export function RunReceiptPanel({ receipt }: RunReceiptPanelProps) {
  if (!receipt) {
    return (
      <div className="border border-border bg-background/80 px-3 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Execution receipt
        </div>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          No execution receipt yet. Legacy runs and in-flight runs may not have canonical receipts.
        </p>
      </div>
    )
  }

  const context = receipt.contextSources
  const webcontainer = receipt.webcontainer
  const nativeExecution = receipt.nativeExecution

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2 border border-border bg-background/80 px-3 py-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Execution receipt
          </div>
          <div className="mt-1 font-mono text-sm text-foreground">{modeLabel(receipt)}</div>
        </div>
        <div className="shadow-sharp-sm border border-primary/45 bg-primary/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
          {receipt.routingDecision.confidence} confidence
        </div>
      </div>

      <ReceiptSection title="Routing" tone="primary">
        <div className="grid gap-2 sm:grid-cols-3">
          <ReceiptMetric label="Agent" value={receipt.agent} />
          <ReceiptMetric label="Source" value={receipt.routingDecision.source.replace('_', ' ')} />
          <ReceiptMetric label="Result" value={receipt.resultStatus} />
        </div>
        <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
          {receipt.routingDecision.rationale}
        </p>
      </ReceiptSection>

      <ReceiptSection title="Context">
        <div className="grid gap-2 sm:grid-cols-4">
          <ReceiptMetric label="Files" value={`${context.filesConsidered.length} considered`} />
          <ReceiptMetric label="Loaded" value={`${context.filesLoaded.length} loaded`} />
          <ReceiptMetric
            label="Memory"
            value={context.memoryBankIncluded ? 'included' : 'skipped'}
          />
          <ReceiptMetric label="Plan" value={context.planIncluded ? 'included' : 'skipped'} />
        </div>
      </ReceiptSection>

      <ReceiptSection title="WebContainer">
        <div className="grid gap-2 sm:grid-cols-3">
          <ReceiptMetric label="Used" value={webcontainer.used ? 'yes' : 'no'} />
          <ReceiptMetric label="Writes" value={webcontainer.filesWritten.length} />
          <ReceiptMetric label="Commands" value={webcontainer.commandsRun.length} />
        </div>
        {webcontainer.commandsRun.length > 0 ? (
          <div className="mt-2 space-y-1">
            {webcontainer.commandsRun.slice(0, 3).map((command, index) => (
              <div
                key={`${command.command}-${index}`}
                className="border border-border bg-muted/20 px-2 py-1 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]"
              >
                {command.command}
              </div>
            ))}
          </div>
        ) : null}
      </ReceiptSection>

      <ReceiptSection title="Native tools">
        <div className="grid gap-2 sm:grid-cols-3">
          <ReceiptMetric label="Files read" value={nativeExecution.filesRead.length} />
          <ReceiptMetric label="Tools" value={nativeExecution.toolsUsed.join(', ') || 'none'} />
          <ReceiptMetric label="Approvals" value={nativeExecution.approvalsRequested.length} />
        </div>
      </ReceiptSection>

      <ReceiptSection title="Tokens">
        <div className="grid gap-2 sm:grid-cols-4">
          <ReceiptMetric label="Input" value={receipt.tokens.input} />
          <ReceiptMetric label="Output" value={receipt.tokens.output} />
          <ReceiptMetric label="Cached" value={receipt.tokens.cached} />
          <ReceiptMetric label="Duration" value={`${receipt.durationMs}ms`} />
        </div>
      </ReceiptSection>
    </div>
  )
}
