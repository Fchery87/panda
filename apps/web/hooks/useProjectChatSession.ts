'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { AvailableModel } from '@/components/chat/ModelSelector'
import { useAutoApplyArtifacts } from './useAutoApplyArtifacts'
import { resolveEffectiveAgentPolicy, type AgentPolicy } from '@/lib/agent/automationPolicy'
import { normalizeChatMode, type ChatMode } from '@/lib/agent/prompt-library'
import type { SpecTier } from '@/lib/agent/spec/types'
import { getGlobalRegistry } from '@/lib/llm/registry'
import type { LLMProvider } from '@/lib/llm/types'
import { getDefaultProviderCapabilities } from '@/lib/llm/types'
import { createE2EProvider, isE2ESpecApprovalModeEnabled } from '@/lib/llm/e2e-provider'
import { appLog } from '@/lib/logger'

type ChatSessionChat = {
  _id: Id<'chats'>
  mode: ChatMode
}

type ProviderSettings = {
  updatedAt?: number
  defaultProvider?: string
  defaultModel?: string
  providerConfigs?: Record<string, unknown>
}

function readAgentPolicyField(
  source: unknown,
  key: 'agentPolicy' | 'agentDefaults'
): AgentPolicy | null | undefined {
  if (!source || typeof source !== 'object') return undefined
  return (source as Record<string, unknown>)[key] as AgentPolicy | null | undefined
}

export function useProjectChatSession<TChat extends ChatSessionChat>(args: {
  projectId: Id<'projects'>
  chats: TChat[] | undefined
  projectAgentPolicy: AgentPolicy | null | undefined
}) {
  const [activeChatId, setActiveChatId] = useState<Id<'chats'> | null>(null)
  const [chatMode, setChatMode] = useState<ChatMode>('architect')
  const [architectBrainstormEnabled, setArchitectBrainstormEnabled] = useState(
    process.env.NEXT_PUBLIC_ENABLE_ARCHITECT_BRAINSTORM === 'true'
  )
  const [uiSelectedModel, setUiSelectedModel] = useState<string | null>(null)
  const [reasoningVariant, setReasoningVariant] = useState('none')
  const [specTier, setSpecTier] = useState<SpecTier | 'auto'>('auto')

  const settings = useQuery(api.settings.get) as ProviderSettings | undefined
  const effectiveSettings = useQuery(api.settings.getEffective) as
    | (ProviderSettings & { effectiveModel?: string })
    | undefined

  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const settingsProviderVersion = settings?.updatedAt ?? null
  const userAgentDefaults = readAgentPolicyField(settings, 'agentDefaults')

  useEffect(() => {
    if (!args.chats || args.chats.length === 0) return
    if (!activeChatId || !args.chats.some((chat) => chat._id === activeChatId)) {
      setActiveChatId(args.chats[0]._id)
    }
  }, [args.chats, activeChatId])

  const activeChat = useMemo(() => {
    if (!args.chats || args.chats.length === 0) return null
    if (activeChatId) return args.chats.find((chat) => chat._id === activeChatId) ?? args.chats[0]
    return args.chats[0]
  }, [args.chats, activeChatId])

  useEffect(() => {
    if (!activeChat?.mode) return
    setChatMode(normalizeChatMode(activeChat.mode, 'architect'))
  }, [activeChat?._id, activeChat?.mode])

  const effectiveAutomationPolicy = useMemo<AgentPolicy>(() => {
    return resolveEffectiveAgentPolicy({
      projectPolicy: args.projectAgentPolicy,
      userDefaults: userAgentDefaults,
      mode: chatMode,
    })
  }, [args.projectAgentPolicy, userAgentDefaults, chatMode])

  useAutoApplyArtifacts({
    projectId: args.projectId,
    chatId: activeChat?._id,
    policy: effectiveAutomationPolicy,
  })

  const provider = useMemo<LLMProvider | null>(() => {
    if (isE2ESpecApprovalModeEnabled()) {
      return createE2EProvider()
    }

    void settingsProviderVersion
    const latestSettings = settingsRef.current
    if (!latestSettings) return null

    const registry = getGlobalRegistry()
    const defaultProviderId = latestSettings.defaultProvider || 'openai'
    const providerConfig = latestSettings.providerConfigs?.[defaultProviderId] as
      | {
          enabled?: boolean
          apiKey?: string
          baseUrl?: string
          defaultModel?: string
          provider?: string
        }
      | undefined

    if (!providerConfig?.enabled || !providerConfig.apiKey) {
      registry.removeProvider(defaultProviderId)
      return null
    }

    const nextProviderConfig = {
      provider: (providerConfig.provider || defaultProviderId) as Parameters<
        typeof getDefaultProviderCapabilities
      >[0],
      auth: {
        apiKey: providerConfig.apiKey || '',
        baseUrl: providerConfig.baseUrl,
      },
      defaultModel: providerConfig.defaultModel,
    }

    const existingProvider = registry.getProvider(defaultProviderId)
    if (existingProvider) {
      const existingConfig = registry.getProviderConfig(defaultProviderId)
      const configChanged =
        existingConfig?.provider !== nextProviderConfig.provider ||
        existingConfig?.auth?.apiKey !== nextProviderConfig.auth.apiKey ||
        existingConfig?.auth?.baseUrl !== nextProviderConfig.auth.baseUrl ||
        existingConfig?.defaultModel !== nextProviderConfig.defaultModel
      if (configChanged) {
        registry.updateProviderConfig(defaultProviderId, nextProviderConfig)
        return registry.getProvider(defaultProviderId) ?? null
      }
      return existingProvider
    }

    try {
      return registry.createProvider(defaultProviderId, nextProviderConfig, true)
    } catch (error) {
      appLog.error('Failed to create provider from settings:', error)
      return null
    }
  }, [settingsProviderVersion])

  const selectedModel = useMemo(() => {
    if (effectiveSettings?.effectiveModel) return effectiveSettings.effectiveModel
    const selectedProviderId = settings?.defaultProvider || 'openai'
    const providerDefaultModel = (
      settings?.providerConfigs?.[selectedProviderId] as Record<string, unknown> | undefined
    )?.defaultModel as string | undefined
    if (providerDefaultModel) return providerDefaultModel
    if (settings?.defaultModel) return settings.defaultModel
    if (provider?.config?.defaultModel) return provider.config.defaultModel
    return 'gpt-4o'
  }, [
    effectiveSettings?.effectiveModel,
    settings?.defaultProvider,
    settings?.defaultModel,
    settings?.providerConfigs,
    provider,
  ])

  const availableModels = useMemo<AvailableModel[]>(() => {
    if (isE2ESpecApprovalModeEnabled()) {
      return [
        {
          id: 'e2e-spec-model',
          name: 'E2E Spec Model',
          provider: 'E2E',
          providerKey: 'e2e',
        },
      ]
    }

    const providerConfigs = effectiveSettings?.providerConfigs
    if (!providerConfigs) return []

    const models: AvailableModel[] = []
    for (const [key, rawConfig] of Object.entries(providerConfigs)) {
      const config = rawConfig as {
        enabled?: boolean
        name?: string
        availableModels?: string[]
      }
      if (!config?.enabled) continue
      const providerName = config.name || key
      for (const modelId of config.availableModels ?? []) {
        const withoutOrg = modelId.includes('/') ? modelId.split('/').slice(1).join('/') : modelId
        const displayName = withoutOrg.split(':')[0]
        models.push({ id: modelId, name: displayName, provider: providerName, providerKey: key })
      }
    }
    return models
  }, [effectiveSettings?.providerConfigs])

  const supportsReasoning = useMemo(() => {
    const providerType = (settings?.defaultProvider || 'openai') as Parameters<
      typeof getDefaultProviderCapabilities
    >[0]
    return getDefaultProviderCapabilities(providerType).supportsReasoning
  }, [settings?.defaultProvider])

  return {
    settings,
    activeChatId,
    setActiveChatId,
    activeChat,
    chatMode,
    setChatMode,
    architectBrainstormEnabled,
    setArchitectBrainstormEnabled,
    uiSelectedModel,
    setUiSelectedModel,
    reasoningVariant,
    setReasoningVariant,
    specTier,
    setSpecTier,
    provider,
    selectedModel,
    availableModels,
    supportsReasoning,
    effectiveAutomationPolicy,
  }
}
