import type { MessageAnnotationInfo, ToolCallInfo } from '@/components/chat/types'
import { extractTargetFilePaths } from '../components/chat/live-run-utils'
import { derivePlanProgressMetadata } from '../lib/agent/plan-progress'
import { computeContextMetrics } from '../lib/llm/token-usage'

export interface ProgressStep {
  id: string
  content: string
  status: 'running' | 'completed' | 'error'
  category?: 'analysis' | 'rewrite' | 'tool' | 'complete' | 'other'
  details?: {
    toolName?: string
    toolCallId?: string
    argsSummary?: string
    durationMs?: number
    errorExcerpt?: string
    targetFilePaths?: string[]
    hasArtifactTarget?: boolean
  }
  planStepIndex?: number
  planStepTitle?: string
  planTotalSteps?: number
  completedPlanStepIndexes?: number[]
  createdAt: number
}

function createProgressId(): string {
  return `progress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildErrorDetails(description: string): NonNullable<ProgressStep['details']> {
  return {
    errorExcerpt: description,
  }
}

function summarizeArgs(args: Record<string, unknown> | undefined): string | undefined {
  if (!args) return undefined
  const serialized = JSON.stringify(args)
  if (!serialized) return undefined
  return serialized.length > 140 ? `${serialized.slice(0, 137)}...` : serialized
}

export function buildProgressStep(args: {
  content: string
  progressStatus?: 'running' | 'completed' | 'error'
  progressCategory?: 'analysis' | 'rewrite' | 'tool' | 'complete'
  progressToolName?: string
  progressToolCallId?: string
  progressArgs?: Record<string, unknown>
  progressDurationMs?: number
  progressError?: string
  progressHasArtifactTarget?: boolean
  planSteps: string[]
  completedPlanStepIndexes: number[]
}): ProgressStep {
  return {
    id: createProgressId(),
    content: args.content,
    status: args.progressStatus ?? 'running',
    category: args.progressCategory ?? 'other',
    details:
      args.progressToolName ||
      args.progressToolCallId ||
      args.progressArgs ||
      args.progressDurationMs ||
      args.progressError
        ? {
            toolName: args.progressToolName,
            toolCallId: args.progressToolCallId,
            argsSummary: summarizeArgs(args.progressArgs),
            durationMs: args.progressDurationMs,
            errorExcerpt: args.progressError?.slice(0, 160),
            targetFilePaths: extractTargetFilePaths(args.progressToolName, args.progressArgs),
            hasArtifactTarget: Boolean(args.progressHasArtifactTarget),
          }
        : undefined,
    ...(derivePlanProgressMetadata(
      args.planSteps,
      args.content,
      args.progressStatus ?? 'running',
      args.completedPlanStepIndexes
    ) ?? {}),
    createdAt: Date.now(),
  }
}

export function buildToolCallInfo(args: {
  id: string
  name: string
  rawArguments: string
}): ToolCallInfo {
  let parsedArgs: Record<string, unknown>
  try {
    parsedArgs = JSON.parse(args.rawArguments)
  } catch {
    parsedArgs = {
      error: 'Failed to parse arguments',
      raw: args.rawArguments,
    }
  }

  return {
    id: args.id,
    name: args.name,
    args: parsedArgs,
    status: 'pending',
  }
}

export function applyToolResult(
  toolCalls: ToolCallInfo[],
  result: {
    toolCallId: string
    output: string
    error?: string
    durationMs: number
  }
): ToolCallInfo[] {
  return toolCalls.map((toolCall) =>
    toolCall.id === result.toolCallId
      ? {
          ...toolCall,
          status: result.error ? 'error' : 'completed',
          result: {
            output: result.output,
            error: result.error,
            durationMs: result.durationMs,
          },
        }
      : toolCall
  )
}

export function buildAssistantAnnotations(args: {
  mode: string
  model: string
  provider?: string
  toolCalls: ToolCallInfo[]
  assistantReasoning: string
  runUsage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    source: 'exact' | 'estimated'
  }
  usageSessionTotalTokens: number
  contextWindow: number
  contextSource: string
}): MessageAnnotationInfo {
  const context = computeContextMetrics({
    usedTokens: args.usageSessionTotalTokens + args.runUsage.totalTokens,
    contextWindow: args.contextWindow,
  })

  const annotations: MessageAnnotationInfo = {
    mode: args.mode as MessageAnnotationInfo['mode'],
    model: args.model,
    provider: args.provider,
    tokenCount: args.runUsage.totalTokens,
    promptTokens: args.runUsage.promptTokens,
    completionTokens: args.runUsage.completionTokens,
    totalTokens: args.runUsage.totalTokens,
    tokenSource: args.runUsage.source,
    contextWindow: args.contextWindow,
    contextUsedTokens: context.usedTokens,
    contextRemainingTokens: context.remainingTokens,
    contextUsagePct: context.usagePct,
    contextSource: args.contextSource as MessageAnnotationInfo['contextSource'],
    ...(args.toolCalls.length > 0 ? { toolCalls: args.toolCalls } : {}),
  }

  if (args.assistantReasoning) {
    annotations.reasoningSummary = args.assistantReasoning
    if (args.runUsage.completionTokens) {
      annotations.reasoningTokens = args.runUsage.completionTokens
    }
  }

  return annotations
}

export function buildSnapshotProgressStep(args: {
  snapshot: {
    hash: string
    step: number
    files: string[]
    timestamp: number
  }
  content?: string
}): ProgressStep {
  return {
    id: `snapshot-${args.snapshot.hash}`,
    content: args.content ?? `Step ${args.snapshot.step} snapshot created`,
    status: 'completed',
    category: 'other',
    createdAt: args.snapshot.timestamp,
  }
}

export function buildVerificationProgressStep(args: { passed?: boolean }): ProgressStep {
  return {
    id: createProgressId(),
    content: args.passed ? 'Specification verified' : 'Specification failed',
    status: args.passed ? 'completed' : 'error',
    category: 'complete',
    details: args.passed
      ? undefined
      : buildErrorDetails(
          'Specification verification failed. Review unmet checks in the run history.'
        ),
    createdAt: Date.now(),
  }
}

export function buildTerminalErrorProgressStep(args: {
  title: string
  description: string
}): ProgressStep {
  return {
    id: createProgressId(),
    content: args.title,
    status: 'error',
    category: 'complete',
    details: buildErrorDetails(args.description),
    createdAt: Date.now(),
  }
}

export function normalizeExactRunUsage(
  usage:
    | {
        promptTokens?: number
        completionTokens?: number
        totalTokens?: number
      }
    | undefined,
  fallback: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    source: 'exact' | 'estimated'
  }
): {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  source: 'exact'
} {
  if (!usage) {
    return {
      promptTokens: fallback.promptTokens,
      completionTokens: fallback.completionTokens,
      totalTokens: fallback.totalTokens,
      source: 'exact',
    }
  }

  const promptTokens = Number.isFinite(Number(usage.promptTokens)) ? Number(usage.promptTokens) : 0
  const completionTokens = Number.isFinite(Number(usage.completionTokens))
    ? Number(usage.completionTokens)
    : 0
  const totalTokens = Number.isFinite(Number(usage.totalTokens))
    ? Number(usage.totalTokens)
    : promptTokens + completionTokens

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    source: 'exact',
  }
}
