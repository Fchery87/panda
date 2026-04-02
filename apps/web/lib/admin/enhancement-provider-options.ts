import { getSharedProviderDefinitions } from '@/lib/llm/provider-definitions'

export interface EnhancementProviderOption {
  name: string
  availableModels: string[]
  enabled: boolean
}

const enhancementProviderKeys = new Set([
  'openai',
  'anthropic',
  'openrouter',
  'together',
  'deepseek',
  'groq',
  'zai',
  'chutes',
])

export function getEnhancementProviderOptions(): Record<string, EnhancementProviderOption> {
  return Object.fromEntries(
    getSharedProviderDefinitions()
      .filter((provider) => enhancementProviderKeys.has(provider.value))
      .map((provider) => [
        provider.value,
        {
          name: provider.label,
          availableModels: provider.models,
          enabled: true,
        } satisfies EnhancementProviderOption,
      ])
  )
}
