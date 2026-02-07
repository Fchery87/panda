import type { ProviderType } from './types'

interface EstimationArgsBase {
  providerType: ProviderType
  model: string
}

interface EstimatePromptTokensArgs extends EstimationArgsBase {
  messages: Array<{ role: string; content: string }>
}

interface EstimateCompletionTokensArgs extends EstimationArgsBase {
  content: string
}

interface ComputeContextMetricsArgs {
  usedTokens: number
  contextWindow: number
}

interface ContextUsageMetrics {
  usedTokens: number
  remainingTokens: number
  usagePct: number
}

function tokensPerChar(providerType: ProviderType, model: string): number {
  const normalized = model.toLowerCase()

  if (providerType === 'anthropic' || normalized.includes('claude')) return 1 / 3.6
  if (providerType === 'zai' || normalized.includes('glm')) return 1 / 3.8
  if (providerType === 'openrouter' || providerType === 'together') return 1 / 4.1
  return 1 / 4
}

function estimateTokensFromText(text: string, providerType: ProviderType, model: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0

  const chars = trimmed.length
  const words = trimmed.split(/\s+/).length
  const base = chars * tokensPerChar(providerType, model)
  const wordOverhead = words * 0.08
  return Math.max(1, Math.ceil(base + wordOverhead))
}

export function estimatePromptTokens(args: EstimatePromptTokensArgs): number {
  const roleOverheadPerMessage = 4
  let total = 0

  for (const message of args.messages) {
    total += roleOverheadPerMessage
    total += estimateTokensFromText(message.content, args.providerType, args.model)
  }

  // Assistant priming overhead
  total += 2

  return Math.max(1, total)
}

export function estimateCompletionTokens(args: EstimateCompletionTokensArgs): number {
  return estimateTokensFromText(args.content, args.providerType, args.model)
}

export function computeContextMetrics(args: ComputeContextMetricsArgs): ContextUsageMetrics {
  const windowSize = Math.max(1, Math.floor(args.contextWindow))
  const used = Math.min(Math.max(0, Math.floor(args.usedTokens)), windowSize)
  const remaining = Math.max(0, windowSize - used)
  const usagePct = Math.min(100, Math.max(0, Number(((used / windowSize) * 100).toFixed(1))))

  return {
    usedTokens: used,
    remainingTokens: remaining,
    usagePct,
  }
}
