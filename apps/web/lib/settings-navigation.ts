import type { AgentPolicy } from '@/lib/agent/automationPolicy'

export const SETTINGS_TABS = ['general', 'providers', 'automation', 'advanced'] as const

export type SettingsTab = (typeof SETTINGS_TABS)[number]

const LEGACY_TAB_MAP: Record<string, SettingsTab> = {
  appearance: 'general',
}

export function resolveSettingsTab(raw: string | null): SettingsTab {
  if (!raw) return 'general'
  const mapped = LEGACY_TAB_MAP[raw]
  if (mapped) return mapped
  return SETTINGS_TABS.includes(raw as SettingsTab) ? (raw as SettingsTab) : 'general'
}

export interface SettingsSnapshotProviderConfig {
  apiKey: string
  enabled: boolean
  defaultModel: string
  baseUrl?: string
  useCodingPlan?: boolean
  reasoningEnabled?: boolean
  reasoningMode?: 'auto' | 'low' | 'medium' | 'high'
  reasoningBudget?: number
  showReasoningPanel?: boolean
}

export interface SettingsSnapshotInput {
  theme: 'light' | 'dark' | 'system'
  language: string
  defaultProvider: string
  defaultModel: string
  providers: Record<string, SettingsSnapshotProviderConfig>
  overrideGlobalProvider: boolean
  overrideGlobalModel: boolean
  agentDefaults: AgentPolicy
}

export function getSettingsTabFromSearchParams(searchParams: URLSearchParams): SettingsTab {
  return resolveSettingsTab(searchParams.get('tab'))
}

export function buildSettingsTabHref(
  pathname: string,
  searchParams: URLSearchParams,
  tab: SettingsTab
): string {
  const nextSearchParams = new URLSearchParams(searchParams)

  if (tab === 'general') {
    nextSearchParams.delete('tab')
  } else {
    nextSearchParams.set('tab', tab)
  }

  const query = nextSearchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

function serializeProviderConfig(provider: SettingsSnapshotProviderConfig): string {
  return JSON.stringify({
    apiKey: provider.apiKey,
    enabled: provider.enabled,
    defaultModel: provider.defaultModel,
    baseUrl: provider.baseUrl ?? '',
    useCodingPlan: provider.useCodingPlan ?? false,
    reasoningEnabled: provider.reasoningEnabled ?? false,
    reasoningMode: provider.reasoningMode ?? 'auto',
    reasoningBudget: provider.reasoningBudget ?? 0,
    showReasoningPanel: provider.showReasoningPanel ?? false,
  })
}

export function createSettingsSignature(input: SettingsSnapshotInput): string {
  return JSON.stringify({
    theme: input.theme,
    language: input.language,
    defaultProvider: input.defaultProvider,
    defaultModel: input.defaultModel,
    overrideGlobalProvider: input.overrideGlobalProvider,
    overrideGlobalModel: input.overrideGlobalModel,
    agentDefaults: input.agentDefaults,
    providers: Object.fromEntries(
      Object.keys(input.providers)
        .sort()
        .map((providerKey) => [providerKey, serializeProviderConfig(input.providers[providerKey])])
    ),
  })
}
