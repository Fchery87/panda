'use client'

import { useMemo } from 'react'
import { computeContextMetrics } from '../lib/llm/token-usage'
import type { ContextWindowResult } from '../lib/llm/model-metadata'
import type { ChatMode } from '../lib/agent/prompt-library'
import type { TokenSource } from '../components/chat/types'

export interface UsageTotals {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface UsageMetrics {
  mode: ChatMode
  session: UsageTotals
  currentRun?: UsageTotals & { source: TokenSource }
  contextWindow: number
  usedTokens: number
  remainingTokens: number
  usagePct: number
  contextSource: ContextWindowResult['source']
}

interface UseTokenUsageMetricsOptions {
  mode: ChatMode
  persistedModeUsage:
    | {
        promptTokens?: number
        completionTokens?: number
        totalTokens?: number
      }
    | null
    | undefined
  currentRunUsage: (UsageTotals & { source: TokenSource }) | undefined
  contextWindowResolution: ContextWindowResult
}

function toFiniteNumber(value: number | undefined): number {
  if (value === undefined || value === null || !Number.isFinite(value)) return 0
  return value
}

export function useTokenUsageMetrics({
  mode,
  persistedModeUsage,
  currentRunUsage,
  contextWindowResolution,
}: UseTokenUsageMetricsOptions): UsageMetrics {
  const sessionUsage = useMemo<UsageTotals>(
    () => ({
      promptTokens: toFiniteNumber(persistedModeUsage?.promptTokens),
      completionTokens: toFiniteNumber(persistedModeUsage?.completionTokens),
      totalTokens: toFiniteNumber(persistedModeUsage?.totalTokens),
    }),
    [persistedModeUsage]
  )

  const usageMetrics = useMemo<UsageMetrics>(() => {
    const sessionWithCurrent: UsageTotals = {
      promptTokens: sessionUsage.promptTokens + (currentRunUsage?.promptTokens ?? 0),
      completionTokens: sessionUsage.completionTokens + (currentRunUsage?.completionTokens ?? 0),
      totalTokens: sessionUsage.totalTokens + (currentRunUsage?.totalTokens ?? 0),
    }
    const context = computeContextMetrics({
      usedTokens: sessionWithCurrent.totalTokens,
      contextWindow: contextWindowResolution.contextWindow,
    })

    return {
      mode,
      session: sessionUsage,
      ...(currentRunUsage ? { currentRun: currentRunUsage } : {}),
      contextWindow: contextWindowResolution.contextWindow,
      usedTokens: context.usedTokens,
      remainingTokens: context.remainingTokens,
      usagePct: context.usagePct,
      contextSource: contextWindowResolution.source,
    }
  }, [mode, sessionUsage, currentRunUsage, contextWindowResolution])

  return usageMetrics
}
