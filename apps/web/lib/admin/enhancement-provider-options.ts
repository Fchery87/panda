import type { ProviderDefinition } from '@/lib/llm/provider-definitions'
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
  'crofai',
])

/**
 * Build enhancement provider options from a provider list.
 * When called without arguments, falls back to static SHARED_PROVIDER_DEFINITIONS.
 */
export function getEnhancementProviderOptions(
  providers?: ProviderDefinition[]
): Record<string, EnhancementProviderOption> {
  const source = providers ?? getSharedProviderDefinitions()
  return Object.fromEntries(
    source
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
