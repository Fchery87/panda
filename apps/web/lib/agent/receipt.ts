import type { Doc } from '@convex/_generated/dataModel'
import type { PersistedRunEventInfo, TokenUsageInfo } from '@/components/chat/types'
import type { RoutingDecision } from './routing'

export type ExecutionReceipt = NonNullable<Doc<'agentRuns'>['receipt']>
export type ContextAuditRecord = ExecutionReceipt['contextSources']

const MAX_RECEIPT_ITEMS = 50

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
    durationMs: Math.max(0, args.completedAt - args.startedAt),
    resultStatus: args.resultStatus,
  }
}
