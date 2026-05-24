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
    <div className="bg-background/80 border border-border px-2 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-xs text-foreground [overflow-wrap:anywhere]">{value}</div>
    </div>
  )
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function validationSummary(receipt: ExecutionReceipt): string {
  const commandCount = receipt.webcontainer.commandsRun.length
  if (commandCount > 0) return pluralize(commandCount, 'command')
  return 'No validation command recorded'
}

function recoverySummary(receipt: ExecutionReceipt): string {
  if (receipt.resultStatus === 'complete') return 'No recovery needed'
  if (receipt.resultStatus === 'approval_timeout') return 'Approval timed out'
  if (receipt.resultStatus === 'aborted') return 'Run stopped before completion'
  return 'Review failure detail'
}

function changeTypeLabel(changeType: string): string {
  return changeType.replace('_', ' ')
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
        'shadow-sharp-sm bg-background/85 border px-3 py-2',
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
      <div className="bg-background/80 border border-border px-3 py-3">
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
      <ReceiptSection title="Owner proof summary" tone="primary">
        <div className="grid gap-2 sm:grid-cols-3">
          <ReceiptMetric label="Outcome" value={receipt.resultStatus} />
          <ReceiptMetric label="Validation" value={validationSummary(receipt)} />
          <ReceiptMetric label="Changed files" value={receipt.webcontainer.filesWritten.length} />
          <ReceiptMetric
            label="Approvals"
            value={receipt.nativeExecution.approvalsRequested.length}
          />
          <ReceiptMetric label="Receipt" value={`v${receipt.version}`} />
          <ReceiptMetric label="Recovery" value={recoverySummary(receipt)} />
        </div>
      </ReceiptSection>

      <div className="bg-background/80 flex flex-wrap items-start justify-between gap-2 border border-border px-3 py-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Execution receipt
          </div>
          <div className="mt-1 font-mono text-sm text-foreground">{modeLabel(receipt)}</div>
        </div>
        <div className="shadow-sharp-sm border-primary/45 bg-primary/5 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
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

      {receipt.contextGuard ? (
        <ReceiptSection title="Context Guard" tone="primary">
          <div className="grid gap-2 sm:grid-cols-4">
            <ReceiptMetric label="Guarded" value={receipt.contextGuard.guardedToolResults} />
            <ReceiptMetric label="Raw" value={formatBytes(receipt.contextGuard.rawBytes)} />
            <ReceiptMetric label="Avoided" value={formatBytes(receipt.contextGuard.bytesAvoided)} />
            <ReceiptMetric label="Indexed" value={`${receipt.contextGuard.indexedChunks} chunks`} />
          </div>
          {receipt.contextGuard.sources.length > 0 ? (
            <div className="mt-2 space-y-1">
              {receipt.contextGuard.sources.slice(0, 3).map((source, index) => (
                <div
                  key={`${source.sourceId ?? source.toolCallId ?? source.toolName}-${index}`}
                  className="bg-muted/20 border border-border px-2 py-1 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]"
                >
                  {source.toolName} • {source.classification ?? 'guarded'} •{' '}
                  {formatBytes(source.bytesAvoided)} avoided
                  {source.chunksWritten ? ` • ${source.chunksWritten} chunks` : ''}
                  {source.sourceId ? ` • ${source.sourceId}` : ''}
                </div>
              ))}
            </div>
          ) : null}
        </ReceiptSection>
      ) : null}

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
                className="bg-muted/20 border border-border px-2 py-1 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]"
              >
                {command.command}
              </div>
            ))}
          </div>
        ) : null}
      </ReceiptSection>

      {receipt.validationEvidence && receipt.validationEvidence.length > 0 ? (
        <ReceiptSection title="Validation evidence">
          <div className="space-y-2">
            {receipt.validationEvidence.map((evidence) => (
              <div
                key={evidence.changeType}
                className="bg-background/80 border border-border px-2 py-1.5"
              >
                <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  {changeTypeLabel(evidence.changeType)}
                </div>
                <div className="mt-1 font-mono text-xs text-foreground [overflow-wrap:anywhere]">
                  {evidence.changedFiles.slice(0, 2).join(', ') || 'No changed files recorded'}
                </div>
                <div className="mt-1 space-y-1">
                  {evidence.validationCommands.length > 0 ? (
                    evidence.validationCommands.slice(0, 2).map((command) => (
                      <div
                        key={`${evidence.changeType}-${command}`}
                        className="bg-muted/20 border border-border px-2 py-1 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]"
                      >
                        {command}
                      </div>
                    ))
                  ) : (
                    <div className="font-mono text-xs text-muted-foreground">
                      No validation command recorded
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ReceiptSection>
      ) : null}

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
