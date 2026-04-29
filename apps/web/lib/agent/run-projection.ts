import type { ExecutionReceipt } from './receipt'

export type RunProjectionSurface = 'chat' | 'proof' | 'public_share'
export type RunProjectionFactType =
  | 'run_started'
  | 'progress_step'
  | 'tool_call'
  | 'tool_result'
  | 'assistant_message'
  | 'spec_verification'
  | 'error'
  | 'snapshot'
  | 'reset'

export interface RunProjectionFact {
  id?: string
  type: RunProjectionFactType | string
  content?: string
  status?: string
  createdAt?: number
  progressCategory?: string
  progressToolName?: string
  toolCallId?: string
  targetFilePaths?: string[]
  args?: unknown
  output?: string
  error?: string
}

export interface RunProjectionItem {
  id: string
  title: string
  summary?: string
  detail?: string
  status?: string
  createdAt?: number
  source: RunProjectionFactType | 'receipt' | 'unknown'
}

export interface RunProjection {
  surface: RunProjectionSurface
  status: 'idle' | 'running' | 'complete' | 'failed' | 'blocked' | 'cancelled'
  items: RunProjectionItem[]
  receipt?: {
    resultStatus: ExecutionReceipt['resultStatus']
    changedFiles: number
    commandsRun: number
    approvals: number
  }
}

interface ProjectRunForSurfaceArgs {
  surface: RunProjectionSurface
  facts?: readonly RunProjectionFact[] | null
  receipt?: ExecutionReceipt | null
  maxItems?: number
}

const DEFAULT_MAX_ITEMS: Record<RunProjectionSurface, number> = {
  chat: 8,
  proof: 50,
  public_share: 8,
}

function sourceForFact(type: string): RunProjectionItem['source'] {
  switch (type) {
    case 'run_started':
    case 'progress_step':
    case 'tool_call':
    case 'tool_result':
    case 'assistant_message':
    case 'spec_verification':
    case 'error':
    case 'snapshot':
    case 'reset':
      return type
    default:
      return 'unknown'
  }
}

function summarizeTargets(paths?: string[]): string | undefined {
  if (!paths || paths.length === 0) return undefined
  const preview = paths.slice(0, 2).join(', ')
  return paths.length > 2 ? `${preview} +${paths.length - 2} more` : preview
}

function titleForFact(fact: RunProjectionFact): string {
  if (fact.content?.trim()) return fact.content.trim()
  if (fact.type === 'tool_call' && fact.progressToolName)
    return `Tool started: ${fact.progressToolName}`
  if (fact.type === 'tool_result' && fact.progressToolName)
    return `Tool completed: ${fact.progressToolName}`
  if (fact.type === 'error') return 'Run failed'
  if (fact.type === 'snapshot') return 'Snapshot recorded'
  return 'Run update'
}

function detailForFact(surface: RunProjectionSurface, fact: RunProjectionFact): string | undefined {
  if (surface !== 'proof') return undefined
  return fact.error ?? fact.output
}

function shouldIncludeFact(surface: RunProjectionSurface, fact: RunProjectionFact): boolean {
  if (surface === 'proof') return true
  if (fact.type === 'tool_call') return false
  if (surface === 'public_share') {
    return fact.type === 'run_started' || fact.type === 'progress_step' || fact.type === 'error'
  }
  return fact.type !== 'tool_result' || Boolean(fact.content || fact.targetFilePaths?.length)
}

function itemFromFact(surface: RunProjectionSurface, fact: RunProjectionFact): RunProjectionItem {
  return {
    id: fact.id ?? `${fact.type}-${fact.createdAt ?? 0}`,
    title: titleForFact(fact),
    summary: summarizeTargets(fact.targetFilePaths) ?? fact.progressToolName,
    detail: detailForFact(surface, fact),
    status: fact.status,
    createdAt: fact.createdAt,
    source: sourceForFact(fact.type),
  }
}

function receiptSummary(receipt: ExecutionReceipt): NonNullable<RunProjection['receipt']> {
  return {
    resultStatus: receipt.resultStatus,
    changedFiles: receipt.webcontainer.filesWritten.length,
    commandsRun: receipt.webcontainer.commandsRun.length,
    approvals: receipt.nativeExecution.approvalsRequested.length,
  }
}

function statusFromReceipt(receipt?: ExecutionReceipt | null): RunProjection['status'] | undefined {
  switch (receipt?.resultStatus) {
    case 'complete':
      return 'complete'
    case 'error':
      return 'failed'
    case 'aborted':
      return 'cancelled'
    case 'approval_timeout':
      return 'blocked'
    default:
      return undefined
  }
}

function projectionStatus(
  facts: readonly RunProjectionFact[],
  receipt?: ExecutionReceipt | null
): RunProjection['status'] {
  const receiptStatus = statusFromReceipt(receipt)
  if (receiptStatus) return receiptStatus
  if (
    facts.some(
      (fact) => fact.type === 'error' || fact.status === 'error' || fact.status === 'failed'
    )
  ) {
    return 'failed'
  }
  if (facts.some((fact) => fact.status === 'running')) return 'running'
  return facts.length > 0 ? 'complete' : 'idle'
}

export function projectRunForSurface(args: ProjectRunForSurfaceArgs): RunProjection {
  const facts = [...(args.facts ?? [])].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
  const maxItems = args.maxItems ?? DEFAULT_MAX_ITEMS[args.surface]
  const items = facts
    .filter((fact) => shouldIncludeFact(args.surface, fact))
    .map((fact) => itemFromFact(args.surface, fact))
    .slice(-maxItems)

  return {
    surface: args.surface,
    status: projectionStatus(facts, args.receipt),
    items,
    receipt:
      args.receipt && args.surface !== 'public_share' ? receiptSummary(args.receipt) : undefined,
  }
}
