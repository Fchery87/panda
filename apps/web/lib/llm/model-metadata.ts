import type { ModelInfo, ProviderType } from './types'

const KNOWN_MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  // OpenAI
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4-turbo': 128000,
  'gpt-3.5-turbo': 16385,

  // Anthropic
  'claude-opus-4-6': 1_000_000,
  'claude-sonnet-4-5': 200_000,

  // Z.ai
  'glm-4.7': 128000,
  'glm-4.7-flashx': 128000,
  'glm-4.7-flash': 128000,

  // Common routing defaults
  'anthropic/claude-3.5-sonnet': 200000,
  'openai/gpt-4o': 128000,
  'togethercomputer/llama-3.1-70b': 128000,
  'meta-llama/Llama-3.1-70B-Instruct-Turbo': 128000,
}

const PROVIDER_FALLBACK_CONTEXT_WINDOWS: Record<ProviderType, number> = {
  openai: 128000,
  openrouter: 128000,
  together: 128000,
  anthropic: 200000,
  zai: 128000,
  custom: 32000,
}

export type ContextWindowSource = 'map' | 'provider' | 'fallback'

interface ResolveContextWindowArgs {
  providerType: ProviderType
  model: string
  providerModels?: ModelInfo[]
}

interface ContextWindowResult {
  contextWindow: number
  source: ContextWindowSource
}

export function resolveContextWindow(args: ResolveContextWindowArgs): ContextWindowResult {
  const model = args.model.trim()

  const known = KNOWN_MODEL_CONTEXT_WINDOWS[model]
  if (typeof known === 'number' && known > 0) {
    return { contextWindow: known, source: 'map' }
  }

  const providerModel = args.providerModels?.find((m) => m.id === model)
  if (
    providerModel &&
    Number.isFinite(providerModel.contextWindow) &&
    providerModel.contextWindow > 0
  ) {
    return { contextWindow: providerModel.contextWindow, source: 'provider' }
  }

  return {
    contextWindow: PROVIDER_FALLBACK_CONTEXT_WINDOWS[args.providerType] ?? 32000,
    source: 'fallback',
  }
}
