'use client'

import { appLog } from '@/lib/logger'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { motion } from 'framer-motion'
import { AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

// Components
import { Workbench } from '@/components/workbench/Workbench'
import { Breadcrumb, buildBreadcrumbItems } from '@/components/workbench/Breadcrumb'
import { StatusBar } from '@/components/workbench/StatusBar'
import { ChatInput } from '@/components/chat/ChatInput'
import type { AvailableModel } from '@/components/chat/ModelSelector'
import { MessageList } from '@/components/chat/MessageList'
import { RunProgressPanel } from '@/components/chat/RunProgressPanel'
import { EvalPanel } from '@/components/chat/EvalPanel'
import { mapLatestRunProgressSteps } from '@/components/chat/live-run-utils'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import { AgentAutomationDialog } from '@/components/projects/AgentAutomationDialog'
import { MemoryBankEditor } from '@/components/chat/MemoryBankEditor'
import { ShareButton } from '@/components/chat/ShareButton'
import { ChatHistoryActions } from '@/components/chat/ChatHistoryActions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  PanelRight,
  PanelRightClose,
  ChevronLeft,
  ChevronDown,
  Bot,
  RotateCcw,
  AlertTriangle,
  Layers,
  MoreHorizontal,
  Activity,
  Brain,
  FlaskConical,
  Settings2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// New UX Components
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { ContextWindowIndicator } from '@/components/chat/ContextWindowIndicator'
import { PlanPanel } from '@/components/plan'

// Hooks
import { useJobs } from '@/hooks/useJobs'
import { useAgent } from '@/hooks/useAgent'
import { useAutoApplyArtifacts } from '@/hooks/useAutoApplyArtifacts'
import { useSpecDriftDetection } from '@/hooks/useSpecDriftDetection'

import type { Message } from '@/components/chat/types'
import { buildMessageWithPlanDraft, deriveNextPlanDraft } from '@/lib/chat/planDraft'
import { isRateLimitError, getUserFacingAgentError } from '@/lib/chat/error-messages'
import { resolveEffectiveAgentPolicy, type AgentPolicy } from '@/lib/agent/automationPolicy'
import { normalizeChatMode, type ChatMode } from '@/lib/agent/prompt-library'

// LLM Provider
import { getGlobalRegistry } from '@/lib/llm/registry'
import type { LLMProvider } from '@/lib/llm/types'
import { getDefaultProviderCapabilities } from '@/lib/llm/types'

interface File {
  _id: Id<'files'>
  _creationTime: number
  projectId: Id<'projects'>
  path: string
  content: string
  isBinary: boolean
  updatedAt: number
}

interface Chat {
  _id: Id<'chats'>
  _creationTime: number
  projectId: Id<'projects'>
  title?: string
  mode: ChatMode
  planDraft?: string
  planUpdatedAt?: number
  createdAt: number
  updatedAt: number
}

interface ConvexMessage {
  _id: Id<'messages'>
  _creationTime: number
  chatId: Id<'chats'>
  role: 'user' | 'assistant' | 'system'
  content: string
  annotations?: Array<Record<string, unknown>>
  createdAt: number
}

interface AgentRunEvent {
  _id: Id<'agentRunEvents'>
  _creationTime: number
  runId: Id<'agentRuns'>
  chatId: Id<'chats'>
  sequence: number
  type: string
  content?: string
  status?: string
  progressCategory?: string
  progressToolName?: string
  progressHasArtifactTarget?: boolean
  targetFilePaths?: string[]
  toolCallId?: string
  toolName?: string
  args?: Record<string, unknown>
  output?: string
  error?: string
  durationMs?: number
  usage?: Record<string, unknown>
  createdAt: number
}

function readAgentPolicyField(
  source: unknown,
  key: 'agentPolicy' | 'agentDefaults'
): AgentPolicy | null | undefined {
  if (!source || typeof source !== 'object') return undefined
  return (source as Record<string, unknown>)[key] as AgentPolicy | null | undefined
}

const FALLBACK_PROVIDER = {} as LLMProvider

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.projectId as Id<'projects'>

  // UI State
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState(false)
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(true)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [selectedFileLocation, setSelectedFileLocation] = useState<{
    line: number
    column: number
    nonce: number
  } | null>(null)
  const [openTabs, setOpenTabs] = useState<Array<{ path: string; isDirty?: boolean }>>([])
  const [cursorPosition, setCursorPosition] = useState<{ line: number; column: number } | null>(
    null
  )
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false)
  const [isDebugDialogOpen, setIsDebugDialogOpen] = useState(false)
  const [isMobileLayout, setIsMobileLayout] = useState(false)
  const [isCompactDesktopLayout, setIsCompactDesktopLayout] = useState(false)
  const [mobilePrimaryPanel, setMobilePrimaryPanel] = useState<'workspace' | 'chat'>('workspace')
  const [mobileUnreadCount, setMobileUnreadCount] = useState(0)
  const [isMobileKeyboardOpen, setIsMobileKeyboardOpen] = useState(false)
  const [isChatInspectorOpen, setIsChatInspectorOpen] = useState(false)
  const [chatInspectorTab, setChatInspectorTab] = useState<'run' | 'memory' | 'evals'>('run')
  const lastAssistantMessageIdRef = useRef<string | null>(null)
  const previousAgentLoadingRef = useRef(false)

  // Fetch project data
  const project = useQuery(api.projects.get, { id: projectId })

  // Spec Drift Hook
  // The hook internally manages showing toasts via showSpecSyncToast
  useSpecDriftDetection({ projectId })

  // Fetch files
  const files = useQuery(api.files.list, { projectId }) as File[] | undefined

  // Fetch chats
  const chats = useQuery(api.chats.list, { projectId }) as Chat[] | undefined

  // Get or create default chat
  const [activeChatId, setActiveChatId] = useState<Id<'chats'> | null>(null)

  useEffect(() => {
    const mobileMedia = window.matchMedia('(max-width: 1023px)')
    const compactDesktopMedia = window.matchMedia('(min-width: 1024px) and (max-width: 1279px)')
    const update = () => {
      setIsMobileLayout(mobileMedia.matches)
      setIsCompactDesktopLayout(compactDesktopMedia.matches)
    }
    update()
    mobileMedia.addEventListener('change', update)
    compactDesktopMedia.addEventListener('change', update)
    return () => {
      mobileMedia.removeEventListener('change', update)
      compactDesktopMedia.removeEventListener('change', update)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setIsChatPanelOpen((prev) => !prev)
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'a') {
        e.preventDefault()
        setIsArtifactPanelOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!chats || chats.length === 0) return
    if (!activeChatId || !chats.some((c) => c._id === activeChatId)) {
      setActiveChatId(chats[0]._id)
    }
  }, [chats, activeChatId])

  const activeChat = useMemo(() => {
    if (!chats || chats.length === 0) return null
    if (activeChatId) return chats.find((c) => c._id === activeChatId) ?? chats[0]
    return chats[0]
  }, [chats, activeChatId])

  // Sync plan draft state when switching chats
  useEffect(() => {
    const nextPlanDraft = activeChat?.planDraft ?? ''
    setPlanDraft(nextPlanDraft)
    lastSavedPlanDraftRef.current = nextPlanDraft
    setPlanUpdatedAt(activeChat?.planUpdatedAt ?? null)
  }, [activeChat?._id, activeChat?.planDraft, activeChat?.planUpdatedAt])

  // Keep UI/runtime mode aligned with the active chat metadata.
  useEffect(() => {
    if (!activeChat?.mode) return
    setChatMode(normalizeChatMode(activeChat.mode, 'architect'))
  }, [activeChat?._id, activeChat?.mode])

  // Jobs (Terminal)
  const { isAnyJobRunning } = useJobs(projectId)

  // Chat mode state - synchronized with ChatInput's internal mode
  const [chatMode, setChatMode] = useState<ChatMode>('architect')
  const [architectBrainstormEnabled, setArchitectBrainstormEnabled] = useState(
    process.env.NEXT_PUBLIC_ENABLE_ARCHITECT_BRAINSTORM === 'true'
  )
  const [uiSelectedModel, setUiSelectedModel] = useState<string | null>(null)
  const [reasoningVariant, setReasoningVariant] = useState('none')
  // Pending message for when we need to create chat first
  const [pendingMessage, setPendingMessage] = useState<{
    id: string
    content: string
    mode: ChatMode
  } | null>(null)
  const pendingMessageDispatchRef = useRef<string | null>(null)

  // Plan Draft (Claude Code-like plan panel)
  const [planDraft, setPlanDraft] = useState('')
  const [planUpdatedAt, setPlanUpdatedAt] = useState<number | null>(null)
  const [isPlanSaving, setIsPlanSaving] = useState(false)
  const lastSavedPlanDraftRef = useRef<string>('')
  const planSaveTimerRef = useRef<number | null>(null)

  // Fetch settings to get provider configuration
  const settings = useQuery(api.settings.get)
  const effectiveSettings = useQuery(api.settings.getEffective)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const settingsProviderVersion = settings?.updatedAt ?? null

  const projectAgentPolicy = readAgentPolicyField(project, 'agentPolicy')
  const userAgentDefaults = readAgentPolicyField(settings, 'agentDefaults')
  const effectiveAutomationPolicy = useMemo<AgentPolicy>(() => {
    const policy = resolveEffectiveAgentPolicy({
      projectPolicy: projectAgentPolicy,
      userDefaults: userAgentDefaults,
      mode: chatMode,
    })
    return policy
  }, [projectAgentPolicy, userAgentDefaults, chatMode])

  useAutoApplyArtifacts({ projectId, chatId: activeChat?._id, policy: effectiveAutomationPolicy })

  // Create LLM provider from settings
  const provider = useMemo<LLMProvider | null>(() => {
    // Use the version as the memo key without depending on referentially-unstable objects.
    void settingsProviderVersion
    const latestSettings = settingsRef.current
    if (!latestSettings) return null

    const registry = getGlobalRegistry()
    const defaultProviderId = latestSettings.defaultProvider || 'openai'
    const providerConfig = latestSettings.providerConfigs?.[defaultProviderId]

    if (!providerConfig?.enabled || !providerConfig.apiKey) {
      registry.removeProvider(defaultProviderId)
      return null
    }

    const nextProviderConfig = {
      provider: (providerConfig?.provider || 'openai') as
        | 'openai'
        | 'openrouter'
        | 'together'
        | 'anthropic'
        | 'zai'
        | 'chutes'
        | 'custom',
      auth: {
        apiKey: providerConfig?.apiKey || '',
        baseUrl: providerConfig?.baseUrl,
      },
      defaultModel: providerConfig?.defaultModel,
    }

    // Check if we already have this provider and refresh it if settings changed.
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
    // Prefer the admin-effective model so the selector shows the right value on refresh
    if (effectiveSettings?.effectiveModel) return effectiveSettings.effectiveModel
    // Fall back to user's configured model
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

  // Build the list of selectable models from enabled providers in effective settings
  const availableModels = useMemo<AvailableModel[]>(() => {
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
        // Strip org prefix ("org/model:variant" → "model") for the display name
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

  // Initialize agent hook when activeChat and provider exist
  // Skip the hook if provider is not available - we'll show an error when user tries to send
  const agent = useAgent({
    chatId: activeChat?._id as Id<'chats'>,
    projectId,
    mode: chatMode,
    architectBrainstormEnabled,
    provider: provider ?? FALLBACK_PROVIDER, // Stable fallback - checked before use
    model: selectedModel,
  })
  const sendAgentMessage = agent.sendMessage

  const artifactRecords = useQuery(
    api.artifacts.list,
    activeChat ? { chatId: activeChat._id } : 'skip'
  ) as
    | Array<{
        _id: Id<'artifacts'>
        status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rejected'
      }>
    | undefined
  const pendingArtifactCount = (artifactRecords || []).filter((a) => a.status === 'pending').length

  // Reset workspace handler
  const handleResetWorkspace = useCallback(() => {
    // Stop any running agent
    agent.stop()
    // Clear chat messages
    agent.clear()
    // Clear input
    agent.setInput('')
    // Clear plan draft
    setPlanDraft('')
    // Reset mode to architect
    setChatMode('architect')
    // Close artifact panel
    setIsArtifactPanelOpen(false)
    // Show confirmation
    toast.success('Workspace reset', {
      description: 'Chat, artifacts, and plan draft have been cleared',
    })
  }, [agent])

  // Handle sending pending message after chat is created
  useEffect(() => {
    if (!pendingMessage || !activeChat || chatMode !== pendingMessage.mode) return
    if (pendingMessageDispatchRef.current === pendingMessage.id) return

    pendingMessageDispatchRef.current = pendingMessage.id
    void sendAgentMessage(pendingMessage.content).finally(() => {
      setPendingMessage((current) => (current?.id === pendingMessage.id ? null : current))
      if (pendingMessageDispatchRef.current === pendingMessage.id) {
        pendingMessageDispatchRef.current = null
      }
    })
  }, [pendingMessage, activeChat, chatMode, sendAgentMessage])

  // Auto-open artifact panel when there are pending artifacts in build/code mode
  useEffect(() => {
    const isWriteMode = chatMode === 'build' || chatMode === 'code'
    if (isWriteMode && pendingArtifactCount > 0 && !isArtifactPanelOpen) {
      setIsArtifactPanelOpen(true)
    }
  }, [pendingArtifactCount, chatMode, isArtifactPanelOpen])

  // Fetch messages for active chat (fallback when not streaming)
  const convexMessages = useQuery(
    api.messages.list,
    activeChat ? { chatId: activeChat._id } : 'skip'
  ) as ConvexMessage[] | undefined
  const runEvents = useQuery(
    api.agentRuns.listEventsByChat,
    activeChat ? { chatId: activeChat._id, limit: 120 } : 'skip'
  ) as AgentRunEvent[] | undefined

  // Convert agent messages to MessageList format
  const chatMessages: Message[] = useMemo(() => {
    if (!activeChat) {
      return (
        convexMessages?.map((msg) => ({
          _id: msg._id,
          role: msg.role,
          content: msg.content,
          reasoningContent:
            Array.isArray(msg.annotations) &&
            msg.annotations.length > 0 &&
            typeof msg.annotations[0]?.reasoningSummary === 'string'
              ? (msg.annotations[0]?.reasoningSummary as string)
              : undefined,
          annotations:
            Array.isArray(msg.annotations) && msg.annotations.length > 0
              ? {
                  mode: normalizeChatMode(msg.annotations[0]?.mode, chatMode),
                  model: msg.annotations[0]?.model as string | undefined,
                  provider: msg.annotations[0]?.provider as string | undefined,
                  tokenCount: msg.annotations[0]?.tokenCount as number | undefined,
                  promptTokens: msg.annotations[0]?.promptTokens as number | undefined,
                  completionTokens: msg.annotations[0]?.completionTokens as number | undefined,
                  totalTokens: msg.annotations[0]?.totalTokens as number | undefined,
                  tokenSource: msg.annotations[0]?.tokenSource as 'exact' | 'estimated' | undefined,
                  contextWindow: msg.annotations[0]?.contextWindow as number | undefined,
                  contextUsedTokens: msg.annotations[0]?.contextUsedTokens as number | undefined,
                  contextRemainingTokens: msg.annotations[0]?.contextRemainingTokens as
                    | number
                    | undefined,
                  contextUsagePct: msg.annotations[0]?.contextUsagePct as number | undefined,
                  contextSource: msg.annotations[0]?.contextSource as
                    | 'map'
                    | 'provider'
                    | 'fallback'
                    | undefined,
                  reasoningTokens: msg.annotations[0]?.reasoningTokens as number | undefined,
                }
              : undefined,
          toolCalls:
            Array.isArray(msg.annotations) &&
            msg.annotations.length > 0 &&
            Array.isArray(msg.annotations[0]?.toolCalls)
              ? (msg.annotations[0]?.toolCalls as Message['toolCalls'])
              : undefined,
          createdAt: msg.createdAt,
        })) || []
      )
    }

    // Use agent messages when available, converting format
    return agent.messages
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => ({
        _id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        reasoningContent: msg.reasoningContent,
        toolCalls: msg.toolCalls,
        annotations: {
          ...(msg.annotations || {}),
          mode: msg.mode,
        },
        createdAt: msg.createdAt,
      }))
  }, [agent.messages, activeChat, chatMode, convexMessages])

  const replayProgressSteps = useMemo(
    () => mapLatestRunProgressSteps(runEvents ?? []).slice(-24),
    [runEvents]
  )
  const liveRunSteps = useMemo(() => {
    return agent.progressSteps.length > 0 ? agent.progressSteps : replayProgressSteps
  }, [agent.progressSteps, replayProgressSteps])
  const latestUserPrompt = useMemo(
    () =>
      [...chatMessages]
        .reverse()
        .find((msg) => msg.role === 'user' && typeof msg.content === 'string' && msg.content.trim())
        ?.content ?? null,
    [chatMessages]
  )
  const latestAssistantReply = useMemo(
    () =>
      [...chatMessages]
        .reverse()
        .find(
          (msg) => msg.role === 'assistant' && typeof msg.content === 'string' && msg.content.trim()
        )?.content ?? null,
    [chatMessages]
  )
  const inlineRateLimitError = useMemo(() => {
    if (!agent.error || !isRateLimitError(agent.error)) return null
    return getUserFacingAgentError(agent.error)
  }, [agent.error])

  useEffect(() => {
    if (agent.isLoading && !previousAgentLoadingRef.current) {
      setIsChatInspectorOpen(true)
      setChatInspectorTab('run')
    }
    previousAgentLoadingRef.current = agent.isLoading
  }, [agent.isLoading])

  // File mutations
  const upsertFileMutation = useMutation(api.files.upsert)
  const deleteFileMutation = useMutation(api.files.remove)

  // Chat mutations
  const createChatMutation = useMutation(api.chats.create)
  const updateChatMutation = useMutation(api.chats.update)

  // Update project last opened
  const updateProjectMutation = useMutation(api.projects.update)

  // Update last opened on mount
  useEffect(() => {
    if (projectId) {
      updateProjectMutation({
        id: projectId,
        lastOpenedAt: Date.now(),
      }).catch((error) => {
        void error
      })
    }
  }, [projectId, updateProjectMutation])

  const persistPlanDraft = useCallback(
    async (nextPlanDraft: string) => {
      const chatId = activeChat?._id
      if (!chatId) return

      const trimmed = nextPlanDraft.trim()
      const lastSaved = lastSavedPlanDraftRef.current.trim()
      if (trimmed === lastSaved) return

      setIsPlanSaving(true)
      try {
        await updateChatMutation({ id: chatId, planDraft: nextPlanDraft })
        lastSavedPlanDraftRef.current = nextPlanDraft
        setPlanUpdatedAt(Date.now())
      } catch (error) {
        toast.error('Failed to save plan draft', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      } finally {
        setIsPlanSaving(false)
      }
    },
    [activeChat?._id, updateChatMutation]
  )

  const savePlanDraftNow = useCallback(() => {
    void persistPlanDraft(planDraft)
  }, [persistPlanDraft, planDraft])

  // Debounced auto-save for plan draft edits
  useEffect(() => {
    if (!activeChat?._id) return
    const trimmed = planDraft.trim()
    const lastSaved = lastSavedPlanDraftRef.current.trim()
    if (trimmed === lastSaved) return

    if (planSaveTimerRef.current !== null) {
      window.clearTimeout(planSaveTimerRef.current)
      planSaveTimerRef.current = null
    }

    planSaveTimerRef.current = window.setTimeout(() => {
      void persistPlanDraft(planDraft)
    }, 750)

    return () => {
      if (planSaveTimerRef.current !== null) {
        window.clearTimeout(planSaveTimerRef.current)
        planSaveTimerRef.current = null
      }
    }
  }, [activeChat?._id, planDraft, persistPlanDraft])

  // Auto-update plan draft after a Plan completion (Claude Code-like)
  useEffect(() => {
    const next = deriveNextPlanDraft({
      mode: chatMode,
      agentStatus: agent.status,
      currentPlanDraft: planDraft,
      requireValidatedBrainstorm: architectBrainstormEnabled,
      messages: agent.messages
        .filter(
          (
            m
          ): m is typeof m & {
            role: 'user' | 'assistant'
          } => m.role === 'user' || m.role === 'assistant'
        )
        .map((m) => ({ role: m.role, mode: m.mode, content: m.content })),
    })
    if (!next) return

    // Don't clobber manual edits that haven't been saved yet.
    if (planDraft.trim() !== lastSavedPlanDraftRef.current.trim()) return

    setPlanDraft(next)
  }, [agent.messages, agent.status, chatMode, planDraft, architectBrainstormEnabled])

  // File operations
  const handleFileSelect = useCallback(
    (path: string, location?: { line: number; column: number }) => {
      setMobilePrimaryPanel('workspace')
      setSelectedFilePath(path)
      if (location) {
        setSelectedFileLocation({
          ...location,
          nonce: Date.now(),
        })
        setCursorPosition({ line: location.line, column: location.column })
      } else {
        setSelectedFileLocation(null)
        setCursorPosition(null)
      }
      setOpenTabs((prev) => {
        if (prev.some((t) => t.path === path)) return prev
        return [...prev, { path }]
      })
    },
    []
  )

  const handleTabClose = useCallback(
    (path: string) => {
      setOpenTabs((prev) => {
        const next = prev.filter((t) => t.path !== path)
        if (next.length === 0) {
          setSelectedFilePath(null)
        } else if (selectedFilePath === path) {
          const index = prev.findIndex((t) => t.path === path)
          const nextTab = next[Math.min(index, next.length - 1)]
          setSelectedFilePath(nextTab?.path ?? null)
        }
        return next
      })
    },
    [selectedFilePath]
  )

  const handleFileCreate = useCallback(
    async (path: string) => {
      try {
        await upsertFileMutation({
          projectId,
          path,
          content: '',
          isBinary: false,
        })
        toast.success(`Created ${path}`)
        setSelectedFilePath(path)
        setSelectedFileLocation(null)
      } catch (error) {
        toast.error('Failed to create file', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [projectId, upsertFileMutation]
  )

  const handleFileRename = useCallback(
    async (oldPath: string, newPath: string) => {
      try {
        const file = files?.find((f) => f.path === oldPath)
        if (!file) {
          toast.error('File not found')
          return
        }

        // Update existing file path in place.
        await upsertFileMutation({
          id: file._id,
          projectId,
          path: newPath,
          content: file.content,
          isBinary: file.isBinary,
        })

        toast.success(`Renamed to ${newPath}`)
        if (selectedFilePath === oldPath) {
          setSelectedFilePath(newPath)
          setSelectedFileLocation(null)
        }
      } catch (error) {
        toast.error('Failed to rename file', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [files, projectId, upsertFileMutation, selectedFilePath]
  )

  const handleFileDelete = useCallback(
    async (path: string) => {
      try {
        const file = files?.find((f) => f.path === path)
        if (!file) {
          toast.error('File not found')
          return
        }

        await deleteFileMutation({ id: file._id })
        toast.success(`Deleted ${path}`)

        if (selectedFilePath === path) {
          setSelectedFilePath(null)
          setSelectedFileLocation(null)
        }
      } catch (error) {
        toast.error('Failed to delete file', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [files, deleteFileMutation, selectedFilePath]
  )

  const handleEditorSave = useCallback(
    async (filePath: string, content: string) => {
      try {
        const file = files?.find((f) => f.path === filePath)
        await upsertFileMutation({
          id: file?._id,
          projectId,
          path: filePath,
          content,
          isBinary: false,
        })
        toast.success(`Saved ${filePath}`)
      } catch (error) {
        toast.error('Failed to save file', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [files, projectId, upsertFileMutation]
  )

  // Chat operations
  const handleSendMessage = useCallback(
    async (content: string, mode: ChatMode, contextFiles?: string[]) => {
      const trimmed = content.trim()
      if (!trimmed) {
        toast.error('Message is empty')
        return
      }

      // Update chat mode
      setChatMode(mode)
      setMobilePrimaryPanel('chat')

      const finalContent =
        mode === 'build' || mode === 'code'
          ? buildMessageWithPlanDraft(planDraft, content, agent.messages)
          : content

      if (!activeChat) {
        // Create new chat if none exists
        try {
          const newChatId = await createChatMutation({
            projectId,
            title: trimmed.slice(0, 50),
            mode,
          })
          toast.success('Chat created')
          setActiveChatId(newChatId)
          // Store pending message - will be sent once chat is active and hook is ready
          setPendingMessage({ id: `pending-${Date.now()}`, content: finalContent, mode })
        } catch (error) {
          void error
          toast.error('Failed to create chat')
        }
        return
      }

      if (activeChat.mode !== mode) {
        await updateChatMutation({ id: activeChat._id, mode })
      }

      // Check if provider is available
      if (!provider) {
        toast.error('LLM provider not configured', {
          description: 'Please configure your LLM settings in the settings page.',
        })
        return
      }

      // Send directly for existing chats.
      await sendAgentMessage(finalContent, contextFiles)
    },
    [
      activeChat,
      projectId,
      createChatMutation,
      sendAgentMessage,
      updateChatMutation,
      provider,
      planDraft,
      setActiveChatId,
      agent.messages,
    ]
  )

  const handleSuggestedAction = useCallback(
    async (prompt: string, targetMode?: ChatMode) => {
      const mode = targetMode ?? chatMode
      if (targetMode) {
        if (activeChat && activeChat.mode !== targetMode) {
          void updateChatMutation({ id: activeChat._id, mode: targetMode })
        }
        setChatMode(targetMode)
      }
      await handleSendMessage(prompt, mode)
    },
    [activeChat, chatMode, handleSendMessage, updateChatMutation]
  )

  const handleModeChange = useCallback(
    (nextMode: ChatMode) => {
      setChatMode(nextMode)
      if (activeChat && activeChat.mode !== nextMode) {
        void updateChatMutation({ id: activeChat._id, mode: nextMode })
      }
    },
    [activeChat, updateChatMutation]
  )

  useEffect(() => {
    if (!isMobileLayout || mobilePrimaryPanel === 'chat') {
      setMobileUnreadCount(0)
    }
  }, [isMobileLayout, mobilePrimaryPanel])

  useEffect(() => {
    const latestAssistant = [...chatMessages].reverse().find((msg) => msg.role === 'assistant')
    if (!latestAssistant) return

    if (!lastAssistantMessageIdRef.current) {
      lastAssistantMessageIdRef.current = latestAssistant._id
      return
    }

    if (latestAssistant._id !== lastAssistantMessageIdRef.current) {
      lastAssistantMessageIdRef.current = latestAssistant._id
      if (isMobileLayout && mobilePrimaryPanel === 'workspace') {
        setMobileUnreadCount((count) => Math.min(99, count + 1))
      }
    }
  }, [chatMessages, isMobileLayout, mobilePrimaryPanel])

  useEffect(() => {
    if (!isMobileLayout) {
      setIsMobileKeyboardOpen(false)
      return
    }

    let focusedInput = false
    let viewportKeyboardOpen = false

    const commitState = () => setIsMobileKeyboardOpen(focusedInput || viewportKeyboardOpen)

    const isTextInputTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      if (target.isContentEditable) return true
      return Boolean(target.closest('input, textarea, [contenteditable="true"]'))
    }

    const onFocusIn = (event: FocusEvent) => {
      focusedInput = isTextInputTarget(event.target)
      commitState()
    }

    const onFocusOut = () => {
      window.setTimeout(() => {
        focusedInput = isTextInputTarget(document.activeElement)
        commitState()
      }, 0)
    }

    const onViewportChange = () => {
      if (!window.visualViewport) return
      const heightDelta = window.innerHeight - window.visualViewport.height
      viewportKeyboardOpen = heightDelta > 140
      commitState()
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    window.visualViewport?.addEventListener('resize', onViewportChange)
    window.visualViewport?.addEventListener('scroll', onViewportChange)
    onViewportChange()
    commitState()

    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      window.visualViewport?.removeEventListener('resize', onViewportChange)
      window.visualViewport?.removeEventListener('scroll', onViewportChange)
    }
  }, [isMobileLayout])

  const shouldShowInspectorStrip = !isMobileLayout && (isChatInspectorOpen || agent.isLoading)

  const chatInspectorTabs = (
    <Tabs
      value={chatInspectorTab}
      onValueChange={(value) => setChatInspectorTab(value as 'run' | 'memory' | 'evals')}
      className="gap-2"
    >
      <TabsList className="h-8 w-full justify-start rounded-none border border-border bg-background p-0 font-mono text-xs">
        <TabsTrigger
          value="run"
          className="h-full rounded-none border-r border-border px-3 font-mono text-xs uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Run
        </TabsTrigger>
        <TabsTrigger
          value="memory"
          className="h-full rounded-none border-r border-border px-3 font-mono text-xs uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Memory
        </TabsTrigger>
        <TabsTrigger
          value="evals"
          className="h-full rounded-none px-3 font-mono text-xs uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Evals
        </TabsTrigger>
      </TabsList>

      <TabsContent value="run" className="m-0">
        <RunProgressPanel
          chatId={activeChat?._id}
          liveSteps={liveRunSteps}
          isStreaming={agent.isLoading}
          tracePersistenceStatus={agent.tracePersistenceStatus}
          onOpenFile={handleFileSelect}
          onOpenArtifacts={() => setIsArtifactPanelOpen(true)}
        />
      </TabsContent>

      <TabsContent value="memory" className="m-0">
        <div className="border border-border bg-background">
          <MemoryBankEditor memoryBank={agent.memoryBank} onSave={agent.updateMemoryBank} />
        </div>
      </TabsContent>

      <TabsContent value="evals" className="m-0">
        <div className="border border-border bg-background">
          <EvalPanel
            projectId={projectId}
            chatId={activeChat?._id}
            lastUserPrompt={latestUserPrompt}
            lastAssistantReply={latestAssistantReply}
            onRunScenario={agent.runEvalScenario}
          />
        </div>
      </TabsContent>
    </Tabs>
  )

  const chatPanelContent = (
    <div
      className={cn(
        'surface-1 relative flex h-full flex-col border-border',
        isMobileLayout ? 'border-t' : 'border-l'
      )}
    >
      {/* Chat Header */}
      <div className="panel-header flex items-center gap-2 max-sm:flex-wrap" data-number="04">
        <Bot className="h-3.5 w-3.5 text-primary" />
        <span>Chat</span>
        <div className="ml-2 hidden min-w-0 flex-1 overflow-hidden md:block">
          <ContextWindowIndicator
            usage={agent.usageMetrics}
            chatHistory={chatMessages}
            onNewSession={handleResetWorkspace}
          />
        </div>
        <div className="scrollbar-thin ml-auto flex items-center gap-1.5 max-sm:ml-0 max-sm:w-full max-sm:flex-nowrap max-sm:justify-end max-sm:overflow-x-auto max-sm:border-t max-sm:border-border max-sm:pt-2">
          {agent.status !== 'idle' && agent.status !== 'complete' && agent.status !== 'error' && (
            <span className="text-xs capitalize text-muted-foreground">
              {agent.status.replace('_', ' ')}
            </span>
          )}
          {agent.isLoading && (
            <button
              type="button"
              onClick={() => {
                setChatInspectorTab('run')
                setIsChatInspectorOpen(true)
              }}
              className="flex h-7 shrink-0 items-center gap-1.5 border border-primary/40 bg-primary/10 px-2 font-mono text-[11px] uppercase tracking-wide text-primary"
              title="Open run inspector"
            >
              <Activity className="h-3 w-3 animate-pulse" />
              <span className="hidden sm:inline">
                {liveRunSteps.length > 0 ? `Running • ${liveRunSteps.length}` : 'Running'}
              </span>
              <span className="sm:hidden">Run</span>
            </button>
          )}
          <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 rounded-none font-mono text-xs">
                Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-none border-border p-0 sm:max-w-2xl">
              <DialogHeader className="sr-only">
                <DialogTitle>Plan Draft</DialogTitle>
              </DialogHeader>
              <PlanPanel
                planDraft={planDraft}
                onChange={setPlanDraft}
                onSave={savePlanDraftNow}
                isSaving={isPlanSaving}
                lastSavedAt={planUpdatedAt}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={isDebugDialogOpen} onOpenChange={setIsDebugDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 rounded-none font-mono text-xs">
                Debug
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-none border-border sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-mono text-sm uppercase tracking-wide">
                  Run Progress
                </DialogTitle>
                <DialogDescription>
                  Detailed run events for troubleshooting and tool-level inspection.
                </DialogDescription>
              </DialogHeader>
              <RunProgressPanel
                chatId={activeChat?._id}
                defaultOpen={true}
                tracePersistenceStatus={agent.tracePersistenceStatus}
              />
            </DialogContent>
          </Dialog>
          <Button
            variant={isChatInspectorOpen ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 shrink-0 gap-1 rounded-none font-mono text-xs"
            onClick={() => setIsChatInspectorOpen((prev) => !prev)}
            title="Toggle inspector"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Inspector</span>
          </Button>
          {activeChat?._id && <ShareButton chatId={activeChat._id} />}
          {activeChat?._id && (
            <ChatHistoryActions chatId={activeChat._id} messageCount={chatMessages.length} />
          )}
        </div>
      </div>

      {shouldShowInspectorStrip ? (
        <div className="surface-2 border-b border-border px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={isChatInspectorOpen ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setIsChatInspectorOpen((prev) => !prev)}
              className="h-7 gap-1.5 rounded-none font-mono text-xs uppercase tracking-wide"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Inspector
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  isChatInspectorOpen && 'rotate-180'
                )}
              />
            </Button>

            <button
              type="button"
              onClick={() => {
                setChatInspectorTab('run')
                setIsChatInspectorOpen(true)
              }}
              className={cn(
                'flex items-center gap-1.5 border px-2 py-1 font-mono text-[11px] uppercase tracking-wide',
                chatInspectorTab === 'run' && isChatInspectorOpen
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <Activity
                className={cn('h-3 w-3', agent.isLoading && 'animate-pulse text-primary')}
              />
              Run
              {agent.isLoading ? (
                <span className="text-primary">
                  {liveRunSteps.length > 0 ? `(${liveRunSteps.length})` : '(live)'}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => {
                setChatInspectorTab('memory')
                setIsChatInspectorOpen(true)
              }}
              className={cn(
                'flex items-center gap-1.5 border px-2 py-1 font-mono text-[11px] uppercase tracking-wide',
                chatInspectorTab === 'memory' && isChatInspectorOpen
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <Brain className="h-3 w-3" />
              Memory
              {agent.memoryBank?.trim() ? <span className="text-primary">(active)</span> : null}
            </button>

            <button
              type="button"
              onClick={() => {
                setChatInspectorTab('evals')
                setIsChatInspectorOpen(true)
              }}
              className={cn(
                'flex items-center gap-1.5 border px-2 py-1 font-mono text-[11px] uppercase tracking-wide',
                chatInspectorTab === 'evals' && isChatInspectorOpen
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <FlaskConical className="h-3 w-3" />
              Evals
            </button>

            <span className="ml-auto hidden font-mono text-[11px] text-muted-foreground xl:inline">
              {agent.isLoading
                ? `Running • ${liveRunSteps.length} live events`
                : 'Conversation focus'}
            </span>
          </div>
        </div>
      ) : null}

      {isChatInspectorOpen && !isMobileLayout ? (
        <div className="surface-2 border-b border-border px-3 py-2">{chatInspectorTabs}</div>
      ) : null}

      {inlineRateLimitError ? (
        <div className="px-3 pb-2">
          <Alert
            variant="destructive"
            className="rounded-none border-destructive/70 bg-destructive/5"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-mono text-xs uppercase tracking-wide">
              {inlineRateLimitError.title}
            </AlertTitle>
            <AlertDescription className="space-y-2 font-mono text-xs">
              <p>{inlineRateLimitError.description}</p>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-none font-mono text-xs"
                >
                  <Link href="/settings">Open LLM Settings</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={chatMessages}
          isStreaming={agent.isLoading}
          onSuggestedAction={handleSuggestedAction}
        />
      </div>

      {/* Input */}
      <ChatInput
        mode={chatMode}
        onModeChange={handleModeChange}
        architectBrainstormEnabled={architectBrainstormEnabled}
        onArchitectBrainstormEnabledChange={setArchitectBrainstormEnabled}
        onSendMessage={handleSendMessage}
        isStreaming={agent.isLoading}
        onStopStreaming={agent.stop}
        filePaths={files?.map((f) => f.path) ?? []}
        model={uiSelectedModel || selectedModel}
        onModelChange={setUiSelectedModel}
        availableModels={availableModels}
        variant={reasoningVariant}
        onVariantChange={setReasoningVariant}
        supportsReasoning={supportsReasoning}
        compactToolbar={true}
      />

      <AnimatePresence>
        {isMobileLayout && isChatInspectorOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close inspector"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatInspectorOpen(false)}
              className="absolute inset-0 z-20 bg-background/55 backdrop-blur-[1px]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="shadow-sharp-lg absolute inset-x-0 bottom-0 z-30 max-h-[85vh] border-t border-border bg-background sm:inset-x-3 sm:bottom-3 sm:max-h-[75vh] sm:border"
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-8 bg-border sm:hidden" />
                  <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                    <Settings2 className="h-3.5 w-3.5 text-primary" />
                    Inspector
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-none"
                  onClick={() => setIsChatInspectorOpen(false)}
                  aria-label="Close inspector"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="max-h-[calc(85vh-44px)] overflow-y-auto p-2 pb-[env(safe-area-inset-bottom)] sm:max-h-[calc(75vh-44px)] sm:p-3">
                {chatInspectorTabs}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  )

  // Loading state
  if (!project || !files) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4 text-center"
        >
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="font-mono text-sm text-muted-foreground">Loading project...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 top-14 z-10 flex flex-col overflow-hidden bg-background">
      {/* Top Bar */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="surface-1 flex h-14 shrink-0 items-center justify-between border-b border-border px-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link href="/projects" className="shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-none"
              aria-label="Back to projects"
              title="Back to projects"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="h-6 w-px bg-border" />

          <Breadcrumb
            projectName={project.name}
            projectId={projectId}
            items={buildBreadcrumbItems(selectedFilePath)}
          />

          {isAnyJobRunning && (
            <span
              className="ml-2 flex h-2 w-2 animate-pulse rounded-full bg-primary"
              title="Jobs running"
            />
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Primary Actions */}
          <div className="flex items-center gap-1 border-r border-border pr-3">
            <AgentAutomationDialog
              projectId={projectId}
              projectPolicy={readAgentPolicyField(project, 'agentPolicy')}
              userDefaults={readAgentPolicyField(settings, 'agentDefaults')}
            />
          </div>

          {/* Secondary Actions */}
          <div className="flex items-center gap-1 pl-3">
            <Button
              variant={isChatPanelOpen ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5 rounded-none font-mono text-xs"
              onClick={() => setIsChatPanelOpen(!isChatPanelOpen)}
              title="Toggle chat panel (Ctrl+B)"
            >
              {isChatPanelOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRight className="h-4 w-4" />
              )}
              <span className="hidden lg:inline">Chat</span>
            </Button>
            <Button
              variant={isArtifactPanelOpen ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'h-8 gap-1.5 rounded-none font-mono text-xs',
                pendingArtifactCount > 0 && !isArtifactPanelOpen && 'text-primary'
              )}
              onClick={() => setIsArtifactPanelOpen(!isArtifactPanelOpen)}
              title="Toggle artifacts panel (Ctrl+Shift+A)"
            >
              {isArtifactPanelOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <Layers className="h-4 w-4" />
              )}
              <span className="hidden lg:inline">Artifacts</span>
              {pendingArtifactCount > 0 && (
                <span
                  className={cn(
                    'ml-0.5 flex h-4 min-w-4 items-center justify-center px-1 text-[10px]',
                    isArtifactPanelOpen
                      ? 'rounded-none bg-primary/20 text-primary'
                      : 'rounded-none bg-primary text-primary-foreground'
                  )}
                >
                  {pendingArtifactCount}
                </span>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 rounded-none font-mono text-xs"
                  title="More actions"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="hidden xl:inline">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-none border-border font-mono">
                <DropdownMenuItem
                  onClick={handleResetWorkspace}
                  className="rounded-none text-xs uppercase tracking-wide"
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Reset Workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div className="relative flex-1 overflow-hidden">
          {isMobileLayout ? (
            <div className="flex h-full flex-col">
              <div className="flex-1 overflow-hidden">
                {mobilePrimaryPanel === 'workspace' ? (
                  <Workbench
                    projectId={projectId}
                    currentChatId={activeChat?._id}
                    files={files}
                    selectedFilePath={selectedFilePath}
                    selectedLocation={selectedFileLocation}
                    openTabs={openTabs}
                    onSelectFile={handleFileSelect}
                    onCloseTab={handleTabClose}
                    onCreateFile={handleFileCreate}
                    onRenameFile={handleFileRename}
                    onDeleteFile={handleFileDelete}
                    onSaveFile={handleEditorSave}
                  />
                ) : (
                  chatPanelContent
                )}
              </div>
              {!isMobileKeyboardOpen && (
                <div className="surface-1 grid min-h-12 grid-cols-2 border-t border-border pb-[env(safe-area-inset-bottom)] font-mono text-xs uppercase tracking-widest">
                  <button
                    type="button"
                    onClick={() => setMobilePrimaryPanel('workspace')}
                    className={cn(
                      'h-full border-r border-border',
                      mobilePrimaryPanel === 'workspace'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobilePrimaryPanel('chat')}
                    className={cn(
                      'relative h-full',
                      mobilePrimaryPanel === 'chat'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Chat
                    {mobileUnreadCount > 0 && mobilePrimaryPanel !== 'chat' && (
                      <span className="absolute right-2 top-1.5 min-w-5 border border-border bg-destructive px-1.5 py-0.5 text-center font-mono text-xs text-destructive-foreground">
                        {mobileUnreadCount}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <PanelGroup direction="horizontal" className="h-full">
              <Panel
                defaultSize={isChatPanelOpen ? (isCompactDesktopLayout ? 64 : 70) : 100}
                minSize={40}
                className="flex flex-col"
              >
                <Workbench
                  projectId={projectId}
                  files={files}
                  selectedFilePath={selectedFilePath}
                  selectedLocation={selectedFileLocation}
                  openTabs={openTabs}
                  onSelectFile={handleFileSelect}
                  onCloseTab={handleTabClose}
                  onCreateFile={handleFileCreate}
                  onRenameFile={handleFileRename}
                  onDeleteFile={handleFileDelete}
                  onSaveFile={handleEditorSave}
                />
              </Panel>

              {isChatPanelOpen && (
                <>
                  <PanelResizeHandle className="h-full w-px bg-border transition-colors hover:bg-primary" />

                  <Panel
                    defaultSize={isCompactDesktopLayout ? 36 : 30}
                    minSize={isCompactDesktopLayout ? 30 : 25}
                    maxSize={isCompactDesktopLayout ? 45 : 50}
                    className="flex flex-col"
                  >
                    {chatPanelContent}
                  </Panel>
                </>
              )}
            </PanelGroup>
          )}

          {/* Artifact Panel - Side drawer */}
          <AnimatePresence>
            {isArtifactPanelOpen && (
              <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="shadow-sharp-lg absolute bottom-0 right-0 top-0 z-40 w-72 border-l border-border bg-background xl:w-80"
              >
                <ArtifactPanel
                  projectId={projectId}
                  chatId={activeChat?._id}
                  isOpen={true}
                  onClose={() => setIsArtifactPanelOpen(false)}
                  position="right"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Command Palette */}
          <CommandPalette
            files={files?.map((f) => ({ path: f.path })) ?? []}
            onModeChange={handleModeChange}
            currentMode={chatMode}
          />
        </div>

        {/* Status Bar */}
        <StatusBar
          filePath={selectedFilePath}
          cursorPosition={cursorPosition}
          isConnected={true}
          isStreaming={agent.isLoading}
        />
      </div>
    </div>
  )
}
