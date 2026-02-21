'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

// Components
import { Workbench } from '@/components/workbench/Workbench'
import { Breadcrumb, buildBreadcrumbItems } from '@/components/workbench/Breadcrumb'
import { StatusBar } from '@/components/workbench/StatusBar'
import { ChatInput } from '@/components/chat/ChatInput'
import { MessageList } from '@/components/chat/MessageList'
import { RunTimelinePanel } from '@/components/chat/RunTimelinePanel'
import { LiveRunPanel } from '@/components/chat/LiveRunPanel'
import { mapLatestRunProgressSteps } from '@/components/chat/live-run-utils'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import { AgentAutomationDialog } from '@/components/projects/AgentAutomationDialog'
import { MemoryBankEditor } from '@/components/chat/MemoryBankEditor'
import { ShareButton } from '@/components/chat/ShareButton'
import { ChatHistoryActions } from '@/components/chat/ChatHistoryActions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
  Bot,
  RotateCcw,
  AlertTriangle,
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

import type { Message } from '@/components/chat/types'
import { buildMessageWithPlanDraft, deriveNextPlanDraft } from '@/lib/chat/planDraft'
import { isRateLimitError, getUserFacingAgentError } from '@/lib/chat/error-messages'
import { resolveChatPanelVisibility } from '@/lib/chat/panelVisibility'
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
  const [mobilePrimaryPanel, setMobilePrimaryPanel] = useState<'workspace' | 'chat'>('workspace')
  const [mobileUnreadCount, setMobileUnreadCount] = useState(0)
  const [isMobileKeyboardOpen, setIsMobileKeyboardOpen] = useState(false)
  const lastAssistantMessageIdRef = useRef<string | null>(null)

  // Fetch project data
  const project = useQuery(api.projects.get, { id: projectId })

  // Fetch files
  const files = useQuery(api.files.list, { projectId }) as File[] | undefined

  // Fetch chats
  const chats = useQuery(api.chats.list, { projectId }) as Chat[] | undefined

  // Get or create default chat
  const [activeChatId, setActiveChatId] = useState<Id<'chats'> | null>(null)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const update = () => setIsMobileLayout(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setIsChatPanelOpen((prev) => !prev)
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
    setChatMode(activeChat.mode)
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
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const settingsProviderVersion = settings?.updatedAt ?? null

  const projectAgentPolicy = (project as any)?.agentPolicy as AgentPolicy | null | undefined
  const userAgentDefaults = (settings as any)?.agentDefaults as AgentPolicy | null | undefined
  const effectiveAutomationPolicy = useMemo<AgentPolicy>(() => {
    const policy = resolveEffectiveAgentPolicy({
      projectPolicy: projectAgentPolicy,
      userDefaults: userAgentDefaults,
      mode: chatMode,
    })
    console.log('[ProjectPage] Effective automation policy:', {
      projectPolicy: projectAgentPolicy,
      userDefaults: userAgentDefaults,
      mode: chatMode,
      effective: policy,
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
      console.error('Failed to create provider from settings:', error)
      return null
    }
  }, [settingsProviderVersion])

  const selectedModel = useMemo(() => {
    const selectedProviderId = settings?.defaultProvider || 'openai'
    const providerDefaultModel = settings?.providerConfigs?.[selectedProviderId]?.defaultModel

    if (providerDefaultModel) return providerDefaultModel
    if (settings?.defaultModel) return settings.defaultModel
    if (provider?.config?.defaultModel) return provider.config.defaultModel
    return 'gpt-4o'
  }, [settings?.defaultProvider, settings?.defaultModel, settings?.providerConfigs, provider])

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
  const panelVisibility = useMemo(
    () => resolveChatPanelVisibility({ showAdvancedDebugInChat: false }),
    []
  )
  const liveRunSteps = useMemo(() => {
    return agent.progressSteps.length > 0 ? agent.progressSteps : replayProgressSteps
  }, [agent.progressSteps, replayProgressSteps])
  const inlineRateLimitError = useMemo(() => {
    if (!agent.error || !isRateLimitError(agent.error)) return null
    return getUserFacingAgentError(agent.error)
  }, [agent.error])

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
      }).catch(console.error)
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
          ? buildMessageWithPlanDraft(planDraft, content)
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
        } catch {
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

  const chatPanelContent = (
    <div
      className={cn(
        'surface-1 flex h-full flex-col border-border',
        isMobileLayout ? 'border-t' : 'border-l'
      )}
    >
      {/* Chat Header */}
      <div className="panel-header flex items-center gap-2" data-number="04">
        <Bot className="h-3.5 w-3.5 text-primary" />
        <span>Chat</span>
        <div className="ml-2 hidden min-w-0 flex-1 overflow-hidden md:block">
          <ContextWindowIndicator
            usage={agent.usageMetrics}
            chatHistory={chatMessages}
            onNewSession={handleResetWorkspace}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {agent.status !== 'idle' && agent.status !== 'complete' && agent.status !== 'error' && (
            <span className="text-xs capitalize text-muted-foreground">
              {agent.status.replace('_', ' ')}
            </span>
          )}
          <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 rounded-none font-mono text-xs">
                Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-none border-border p-0 sm:max-w-2xl">
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
                  Run Timeline
                </DialogTitle>
                <DialogDescription>
                  Detailed run events for troubleshooting and tool-level inspection.
                </DialogDescription>
              </DialogHeader>
              <RunTimelinePanel chatId={activeChat?._id} events={runEvents} defaultOpen={true} />
            </DialogContent>
          </Dialog>
          {activeChat?._id && <ShareButton chatId={activeChat._id} />}
          {activeChat?._id && (
            <ChatHistoryActions chatId={activeChat._id} messageCount={chatMessages.length} />
          )}
        </div>
      </div>

      {panelVisibility.showInlineRunTimeline ? (
        <RunTimelinePanel chatId={activeChat?._id} events={runEvents} />
      ) : null}
      <LiveRunPanel
        steps={liveRunSteps}
        isStreaming={agent.isLoading}
        onOpenFile={handleFileSelect}
        onOpenArtifacts={() => setIsArtifactPanelOpen(true)}
      />

      {/* Memory Bank Editor */}
      <MemoryBankEditor memoryBank={agent.memoryBank} onSave={agent.updateMemoryBank} />

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
        variant={reasoningVariant}
        onVariantChange={setReasoningVariant}
        supportsReasoning={supportsReasoning}
      />
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
            {pendingArtifactCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="h-8 gap-1.5 rounded-none font-mono text-xs"
                onClick={() => setIsArtifactPanelOpen(true)}
              >
                <span className="flex h-2 w-2 animate-pulse rounded-full bg-white" />
                {pendingArtifactCount}
              </Button>
            )}
            <AgentAutomationDialog
              projectId={projectId}
              projectPolicy={(project as any)?.agentPolicy}
              userDefaults={(settings as any)?.agentDefaults}
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
              className="h-8 gap-1.5 rounded-none font-mono text-xs"
              onClick={() => setIsArtifactPanelOpen(!isArtifactPanelOpen)}
            >
              <PanelRight className="h-4 w-4" />
              <span className="hidden sm:inline">Artifacts</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-none font-mono text-xs"
              onClick={handleResetWorkspace}
              title="Reset workspace"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
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
                <div className="surface-1 grid h-12 grid-cols-2 border-t border-border font-mono text-xs uppercase tracking-widest">
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
                defaultSize={isChatPanelOpen ? 70 : 100}
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

                  <Panel defaultSize={30} minSize={25} maxSize={50} className="flex flex-col">
                    {chatPanelContent}
                  </Panel>
                </>
              )}
            </PanelGroup>
          )}

          {/* Floating Artifact Panel */}
          {isArtifactPanelOpen && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="absolute bottom-12 right-4 top-4 z-40"
            >
              <ArtifactPanel
                projectId={projectId}
                chatId={activeChat?._id}
                isOpen={true}
                onClose={() => setIsArtifactPanelOpen(false)}
                position="floating"
              />
            </motion.div>
          )}

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
