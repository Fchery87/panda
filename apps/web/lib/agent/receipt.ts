import type { Doc } from '@convex/_generated/dataModel'
import type { PersistedRunEventInfo, TokenUsageInfo } from '@/components/chat/types'
import type { RoutingDecision } from './routing'

export type ExecutionReceipt = NonNullable<Doc<'agentRuns'>['receipt']>
export type ContextAuditRecord = ExecutionReceipt['contextSources']

const MAX_RECEIPT_ITEMS = 50

type ValidationEvidence = NonNullable<ExecutionReceipt['validationEvidence']>[number]
type ChangeType = ValidationEvidence['changeType']

export interface BuildExecutionReceiptArgs {
  routingDecision: RoutingDecision
  providerModel?: string
  contextSources: ContextAuditRecord
  runEvents: PersistedRunEventInfo[]
  usage?: TokenUsageInfo
  startedAt: number
  completedAt: number
  resultStatus: ExecutionReceipt['resultStatus']
  webcontainer: {
    used: boolean
    unavailableReason?: string
    filesWritten?: string[]
    terminalSessionId?: string
  }
}

function boundArray<T>(values: T[]): { values: T[]; truncated: boolean } {
  return {
    values: values.slice(0, MAX_RECEIPT_ITEMS),
    truncated: values.length > MAX_RECEIPT_ITEMS,
  }
}

function uniqueBounded(values: string[]): { values: string[]; truncated: boolean } {
  const unique = [...new Set(values.filter(Boolean))]
  return {
    values: unique.slice(0, MAX_RECEIPT_ITEMS),
    truncated: unique.length > MAX_RECEIPT_ITEMS,
  }
}

function redactCommand(command: string): { command: string; redacted: boolean } {
  const redacted = command
    .replace(/\b([A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*)=([^\s]+)/giu, '$1=[REDACTED]')
    .replace(/\b(Authorization:\s*Bearer\s+)([^"'\s]+)/giu, '$1[REDACTED]')
    .replace(/(--(?:api-key|token|secret|password)\s+)([^\s]+)/giu, '$1[REDACTED]')
  return {
    command: redacted,
    redacted: redacted !== command,
  }
}

function getStringArrayArg(args: Record<string, unknown> | undefined, key: string): string[] {
  const value = args?.[key]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function getStringArg(args: Record<string, unknown> | undefined, key: string): string | null {
  const value = args?.[key]
  return typeof value === 'string' ? value : null
}

function changeTypeForFile(path: string): ChangeType {
  if (path.startsWith('docs/') || path.endsWith('.md') || path.endsWith('.mdx')) return 'docs'
  if (path.startsWith('convex/')) return 'convex'
  if (path.includes('/e2e/') || path.endsWith('.e2e-spec.ts') || path.endsWith('.spec.ts')) {
    return 'e2e'
  }
  if (path.includes('/github') || path.includes('GitHub')) return 'github'
  if (path.includes('security') || path.includes('auth') || path.includes('proxy'))
    return 'security'
  if (path.includes('/agent/') || path.includes('/webcontainer/') || path.includes('/workspace/')) {
    return 'runtime'
  }
  if (
    path.startsWith('apps/web/app/') ||
    path.startsWith('apps/web/components/') ||
    path.endsWith('.tsx') ||
    path.endsWith('.css')
  ) {
    return 'ui'
  }
  return 'general'
}

function commandMatchesChangeType(command: string, changeType: ChangeType): boolean {
  const normalized = command.toLowerCase()
  switch (changeType) {
    case 'docs':
      return (
        normalized.includes('format') ||
        normalized.includes('markdown') ||
        normalized.includes('docs')
      )
    case 'ui':
      return (
        normalized.includes('test') ||
        normalized.includes('lint') ||
        normalized.includes('typecheck')
      )
    case 'convex':
      return normalized.includes('convex') || normalized.includes('typecheck')
    case 'runtime':
      return normalized.includes('test') || normalized.includes('typecheck')
    case 'security':
      return (
        normalized.includes('test') ||
        normalized.includes('lint') ||
        normalized.includes('security')
      )
    case 'github':
      return normalized.includes('test') || normalized.includes('github')
    case 'e2e':
      return (
        normalized.includes('playwright') ||
        normalized.includes('e2e') ||
        normalized.includes('test:e2e')
      )
    case 'general':
      return (
        normalized.includes('test') ||
        normalized.includes('lint') ||
        normalized.includes('typecheck')
      )
  }
}

function buildValidationEvidence(filesWritten: string[], commandsRun: { command: string }[]) {
  const evidenceByType = new Map<
    ChangeType,
    { changedFiles: string[]; validationCommands: string[] }
  >()

  for (const file of filesWritten) {
    const changeType = changeTypeForFile(file)
    const evidence = evidenceByType.get(changeType) ?? { changedFiles: [], validationCommands: [] }
    evidence.changedFiles.push(file)
    evidenceByType.set(changeType, evidence)
  }

  for (const [changeType, evidence] of evidenceByType) {
    evidence.validationCommands = commandsRun
      .map((command) => command.command)
      .filter((command) => commandMatchesChangeType(command, changeType))
      .slice(0, MAX_RECEIPT_ITEMS)
  }

  return Array.from(evidenceByType, ([changeType, evidence]) => ({
    changeType,
    changedFiles: evidence.changedFiles.slice(0, MAX_RECEIPT_ITEMS),
    validationCommands: evidence.validationCommands,
  }))
}

function buildSubagentRollup(args: BuildExecutionReceiptArgs['runEvents']) {
  const bySubagent = new Map<string, NonNullable<(typeof args)[number]['subagentSummary']>>()

  for (const event of args) {
    const summary = event.subagentSummary
    if (!summary) continue
    if (summary.status === 'running') continue
    bySubagent.set(summary.subagentId, summary)
  }

  const values = [...bySubagent.values()].slice(0, MAX_RECEIPT_ITEMS)
  return {
    values,
    truncated: bySubagent.size > MAX_RECEIPT_ITEMS,
  }
}

export function buildExecutionReceipt(args: BuildExecutionReceiptArgs): ExecutionReceipt {
  const filesConsidered = boundArray(args.contextSources.filesConsidered)
  const filesLoaded = boundArray(args.contextSources.filesLoaded)
  const filesExcluded = boundArray(args.contextSources.filesExcluded)
  const contextSources = {
    ...args.contextSources,
    filesConsidered: filesConsidered.values,
    filesLoaded: filesLoaded.values,
    filesExcluded: filesExcluded.values,
    truncated:
      args.contextSources.truncated ||
      filesConsidered.truncated ||
      filesLoaded.truncated ||
      filesExcluded.truncated,
  }
  const filesRead = uniqueBounded(
    args.runEvents.flatMap((event) => {
      if (event.toolName === 'read_files') return getStringArrayArg(event.args, 'paths')
      if (event.toolName === 'read_file') {
        const path = getStringArg(event.args, 'path')
        return path ? [path] : []
      }
      return []
    })
  )
  const filesWritten = uniqueBounded(args.webcontainer.filesWritten ?? [])
  const observedTools = args.runEvents.flatMap((event) => event.toolName ?? [])
  const toolsUsed = uniqueBounded(observedTools)
  const commandEvents = args.runEvents
    .map((event) => {
      const command =
        event.toolName === 'run_command' || event.toolName === 'runCommand'
          ? getStringArg(event.args, 'command')
          : null
      return command ? redactCommand(command) : null
    })
    .filter((command): command is { command: string; redacted: boolean } => Boolean(command))
  const commandsRun = commandEvents.slice(0, MAX_RECEIPT_ITEMS)
  const approvalEvents = args.runEvents.flatMap((event) => {
    if (event.type !== 'approval_decision' && event.type !== 'permission_decision') return []
    return {
      tool: event.toolName ?? 'unknown',
      decision: event.status ?? 'unknown',
      ...(event.content ? { reason: event.content } : {}),
      timestamp: event.createdAt ?? args.completedAt,
    }
  })
  const approvalsRequested = boundArray(approvalEvents)
  const validationEvidence = buildValidationEvidence(filesWritten.values, commandsRun)
  const subagentRollup = buildSubagentRollup(args.runEvents)

  return {
    version: 1,
    mode: args.routingDecision.resolvedMode,
    requestedMode: args.routingDecision.requestedMode,
    resolvedMode: args.routingDecision.resolvedMode,
    agent: args.routingDecision.agent,
    routingDecision: args.routingDecision,
    providerModel: args.providerModel,
    contextSources,
    webcontainer: {
      used: args.webcontainer.used,
      unavailableReason: args.webcontainer.unavailableReason,
      filesWritten: filesWritten.values,
      commandsRun,
      terminalSessionId: args.webcontainer.terminalSessionId,
      truncated: filesWritten.truncated || commandEvents.length > MAX_RECEIPT_ITEMS,
    },
    nativeExecution: {
      filesRead: filesRead.values,
      toolsUsed: toolsUsed.values,
      approvalsRequested: approvalsRequested.values,
      truncated:
        filesRead.truncated ||
        toolsUsed.truncated ||
        approvalsRequested.truncated ||
        observedTools.length > MAX_RECEIPT_ITEMS,
    },
    tokens: {
      input: args.usage?.promptTokens ?? 0,
      output: args.usage?.completionTokens ?? 0,
      cached: args.usage?.cacheRead ?? 0,
    },
    validationEvidence,
    ...(subagentRollup.values.length > 0 ? { subagents: subagentRollup.values } : {}),
    durationMs: Math.max(0, args.completedAt - args.startedAt),
    resultStatus: args.resultStatus,
  }
}
