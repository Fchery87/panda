import type { ChatMode } from '../chat-modes'
import { CHAT_MODE_CONFIGS } from '../chat-modes'
import { findCapability } from './model-capabilities'
import { resolveContextWindow } from '@/lib/llm/model-metadata'
import type { ModelInfo, ProviderType } from '@/lib/llm/types'

export type ModelPreflightTone = 'ready' | 'warning'

export interface ModelPreflightSummary {
  tone: ModelPreflightTone
  modelLabel: string
  modeSupport: string
  toolGrammar: string
  context: string
  cost: string
  reasoning: string
  notes: string[]
}

interface BuildModelPreflightArgs {
  mode: ChatMode
  providerId: string
  modelId: string
  providerModels?: ModelInfo[]
}

function contextSourceLabel(source: 'map' | 'provider' | 'fallback'): string {
  if (source === 'provider') return 'provider metadata'
  if (source === 'map') return 'known model map'
  return 'fallback estimate'
}

export function buildModelPreflight(args: BuildModelPreflightArgs): ModelPreflightSummary {
  const capability = findCapability(args.providerId, args.modelId)
  const providerModel = args.providerModels?.find((model) => model.id === args.modelId)
  const modeConfig = CHAT_MODE_CONFIGS[args.mode]
  const requiresTools = modeConfig.requiresToolCalls
  const grammars = capability?.toolCallGrammars ?? []
  const context = resolveContextWindow({
    providerType: args.providerId as ProviderType,
    model: args.modelId,
    providerModels: args.providerModels,
  })
  const pricingAvailable = Boolean(providerModel?.pricing)
  const reasoningSupport = providerModel?.capabilities.supportsReasoning
  const notes: string[] = []

  if (requiresTools && grammars.length === 0) {
    notes.push('Use Ask or Plan first if tool execution is uncertain.')
  }

  const modeLabel = modeConfig.surface.label
  const toolReady = !requiresTools || grammars.length > 0

  return {
    tone: toolReady ? 'ready' : 'warning',
    modelLabel: `${args.providerId} / ${args.modelId}`,
    modeSupport: requiresTools
      ? toolReady
        ? `${modeLabel} mode can use tools with this model.`
        : `${modeLabel} mode needs tool support; this model is unverified.`
      : `${modeLabel} mode does not require tool calls.`,
    toolGrammar:
      grammars.length > 0
        ? `Tool grammar: ${grammars.join(', ')}`
        : 'Tool grammar: no verified grammar',
    context: `Context: ${context.contextWindow} tokens from ${contextSourceLabel(context.source)}`,
    cost: pricingAvailable
      ? 'Cost visibility: pricing available'
      : 'Cost visibility: pricing unavailable',
    reasoning:
      reasoningSupport === true
        ? 'Reasoning: supported'
        : reasoningSupport === false
          ? 'Reasoning: not supported'
          : 'Reasoning: unknown',
    notes,
  }
}
