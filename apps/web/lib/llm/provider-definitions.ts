export interface ProviderDefinition {
  value: string
  label: string
  models: string[]
}

export interface ProviderDefinitionConfig {
  name?: string
  availableModels?: string[]
}

export const SHARED_PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  {
    value: 'openai',
    label: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  {
    value: 'openrouter',
    label: 'OpenRouter',
    models: [
      'qwen/qwen3-coder:free',
      'moonshotai/kimi-dev-72b:free',
      'deepseek/deepseek-coder:free',
    ],
  },
  {
    value: 'together',
    label: 'Together.ai',
    models: [
      'meta-llama/Llama-3.1-70B-Instruct-Turbo',
      'meta-llama/Llama-3.1-8B-Instruct-Turbo',
      'mistralai/Mixtral-8x22B-Instruct-v0.1',
      'Qwen/Qwen2.5-72B-Instruct-Turbo',
    ],
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    models: ['claude-opus-4-6', 'claude-sonnet-4-5'],
  },
  {
    value: 'zai',
    label: 'Z.ai',
    models: ['glm-4.7', 'glm-4.7-flashx', 'glm-4.7-flash'],
  },
  {
    value: 'chutes',
    label: 'Chutes.ai',
    models: [
      'deepseek-ai/DeepSeek-V3',
      'meta-llama/Llama-3.1-70B-Instruct',
      'meta-llama/Llama-3.1-8B-Instruct',
      'meta-llama/Llama-3.2-11B-Vision-Instruct',
      'Qwen/Qwen2.5-72B-Instruct',
    ],
  },
  {
    value: 'deepseek',
    label: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
  },
  {
    value: 'groq',
    label: 'Groq',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
  },
  {
    value: 'fireworks',
    label: 'Fireworks AI',
    models: [
      'accounts/fireworks/models/llama-v3p1-70b-instruct',
      'accounts/fireworks/models/llama-v3p1-8b-instruct',
      'accounts/fireworks/models/qwen2p5-72b-instruct',
      'accounts/fireworks/models/deepseek-v3',
    ],
  },
  {
    value: 'crofai',
    label: 'crof.ai',
    models: [
      'kimi-k2.5',
      'kimi-k2.5-lightning',
      'glm-5.1',
      'glm-5.1-precision',
      'glm-5',
      'glm-4.7',
      'glm-4.7-flash',
      'gemma-4-31b-it',
      'minimax-m2.5',
      'qwen3.5-397b-a17b',
      'qwen3.5-9b',
      'deepseek-v3.2',
    ],
  },
]

export function getSharedProviderDefinitions(): ProviderDefinition[] {
  return SHARED_PROVIDER_DEFINITIONS
}

function normalizeModelIds(modelIds: string[] | undefined): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const modelId of modelIds ?? []) {
    const trimmed = modelId.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    normalized.push(trimmed)
  }

  return normalized
}

export function buildProviderDefinitionsFromConfigs(
  definitions: ProviderDefinition[],
  providerConfigs: Record<string, ProviderDefinitionConfig> | undefined
): ProviderDefinition[] {
  if (!providerConfigs) return definitions

  const mergedById = new Map(definitions.map((definition) => [definition.value, definition]))

  for (const [providerKey, config] of Object.entries(providerConfigs)) {
    const freshModels = normalizeModelIds(config.availableModels)
    if (freshModels.length === 0) continue

    const existing = mergedById.get(providerKey)
    mergedById.set(providerKey, {
      value: providerKey,
      label: config.name || existing?.label || providerKey,
      models: normalizeModelIds([...freshModels, ...(existing?.models ?? [])]),
    })
  }

  return Array.from(mergedById.values())
}
