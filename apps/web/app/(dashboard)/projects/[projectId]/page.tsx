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
import { ChatInput } from '@/components/chat/ChatInput'
import { MessageList } from '@/components/chat/MessageList'
import { PlanDraftPanel } from '@/components/chat/PlanDraftPanel'
import { RunTimelinePanel } from '@/components/chat/RunTimelinePanel'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import { AgentAutomationDialog } from '@/components/projects/AgentAutomationDialog'
import { Button } from '@/components/ui/button'
import { PandaLogo } from '@/components/ui/panda-logo'
import { PanelRight, ChevronLeft, Bot, RotateCcw } from 'lucide-react'
import Link from 'next/link'

// Hooks
import { useJobs } from '@/hooks/useJobs'
import { useAgent } from '@/hooks/useAgent'
import { useAutoApplyArtifacts } from '@/hooks/useAutoApplyArtifacts'

import type { Message } from '@/components/chat/types'
import { buildMessageWithPlanDraft, deriveNextPlanDraft } from '@/lib/chat/planDraft'
import { resolveEffectiveAgentPolicy, type AgentPolicy } from '@/lib/agent/automationPolicy'

// LLM Provider
import { getGlobalRegistry } from '@/lib/llm/registry'
import type { LLMProvider } from '@/lib/llm/types'

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
  mode: 'discuss' | 'build'
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

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.projectId as Id<'projects'>

  // UI State
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState(false)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)

  // Fetch project data
  const project = useQuery(api.projects.get, { id: projectId })

  // Fetch files
  const files = useQuery(api.files.list, { projectId }) as File[] | undefined

  // Fetch chats
  const chats = useQuery(api.chats.list, { projectId }) as Chat[] | undefined

  // Get or create default chat
  const [activeChatId, setActiveChatId] = useState<Id<'chats'> | null>(null)

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

  // Jobs (Terminal)
  const { isAnyJobRunning } = useJobs(projectId)

  // Chat mode state - synchronized with ChatInput's internal mode
  const [chatMode, setChatMode] = useState<'discuss' | 'build'>('discuss')

  // Pending message for when we need to create chat first
  const [pendingMessage, setPendingMessage] = useState<{
    content: string
    mode: 'discuss' | 'build'
  } | null>(null)

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
    })
    console.log('[ProjectPage] Effective automation policy:', {
      projectPolicy: projectAgentPolicy,
      userDefaults: userAgentDefaults,
      effective: policy,
    })
    return policy
  }, [projectAgentPolicy, userAgentDefaults])

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

    // Check if we already have this provider
    const existingProvider = registry.getProvider(defaultProviderId)
    if (existingProvider) {
      return existingProvider
    }

    // Create provider from settings if enabled
    if (providerConfig?.enabled && providerConfig.apiKey) {
      try {
        return registry.createProvider(
          defaultProviderId,
          {
            provider: providerConfig.provider || 'openai',
            auth: {
              apiKey: providerConfig.apiKey,
              baseUrl: providerConfig.baseUrl,
            },
            defaultModel: providerConfig.defaultModel,
          },
          true
        )
      } catch (error) {
        console.error('Failed to create provider from settings:', error)
        return null
      }
    }

    // Fallback: try to create from environment (for client-side, this might not work)
    // In production, settings should always be configured
    return null
  }, [settingsProviderVersion])

  // Initialize agent hook when activeChat and provider exist
  // Skip the hook if provider is not available - we'll show an error when user tries to send
  const agent = useAgent({
    chatId: activeChat?._id as Id<'chats'>,
    projectId,
    mode: chatMode,
    provider: provider || ({} as LLMProvider), // Type-safe fallback - checked before use
    model:
      settings?.providerConfigs?.[settings?.defaultProvider || 'openai']?.defaultModel || 'gpt-4o',
  })

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
    // Reset mode to discuss
    setChatMode('discuss')
    // Close artifact panel
    setIsArtifactPanelOpen(false)
    // Show confirmation
    toast.success('Workspace reset', {
      description: 'Chat, artifacts, and plan draft have been cleared',
    })
  }, [agent])

  // Handle sending pending message after chat is created
  useEffect(() => {
    if (pendingMessage && activeChat && chatMode === pendingMessage.mode) {
      agent.handleSubmit()
      setPendingMessage(null)
    }
  }, [pendingMessage, activeChat, chatMode, agent])

  // Auto-open artifact panel when there are pending artifacts in build mode
  useEffect(() => {
    if (chatMode === 'build' && pendingArtifactCount > 0 && !isArtifactPanelOpen) {
      setIsArtifactPanelOpen(true)
    }
  }, [pendingArtifactCount, chatMode, isArtifactPanelOpen])

  // Fetch messages for active chat (fallback when not streaming)
  const convexMessages = useQuery(
    api.messages.list,
    activeChat ? { chatId: activeChat._id } : 'skip'
  ) as ConvexMessage[] | undefined

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
                  mode: msg.annotations[0]?.mode as 'discuss' | 'build' | undefined,
                  model: msg.annotations[0]?.model as string | undefined,
                  provider: msg.annotations[0]?.provider as string | undefined,
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
        annotations: { mode: msg.mode },
        createdAt: msg.createdAt,
      }))
  }, [agent.messages, activeChat, convexMessages])

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

  // Auto-update plan draft after a Discuss completion (Claude Code-like)
  useEffect(() => {
    const next = deriveNextPlanDraft({
      mode: chatMode,
      agentStatus: agent.status,
      currentPlanDraft: planDraft,
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
  }, [agent.messages, agent.status, chatMode, planDraft])

  // File operations
  const handleFileSelect = useCallback((path: string) => {
    setSelectedFilePath(path)
  }, [])

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

        // Create new file with same content
        await upsertFileMutation({
          projectId,
          path: newPath,
          content: file.content,
          isBinary: file.isBinary,
        })

        // Delete old file
        await deleteFileMutation({ id: file._id })

        toast.success(`Renamed to ${newPath}`)
        if (selectedFilePath === oldPath) {
          setSelectedFilePath(newPath)
        }
      } catch (error) {
        toast.error('Failed to rename file', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [files, projectId, upsertFileMutation, deleteFileMutation, selectedFilePath]
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
    async (content: string, mode: 'discuss' | 'build') => {
      const trimmed = content.trim()
      if (!trimmed) {
        toast.error('Message is empty')
        return
      }

      // Update chat mode
      setChatMode(mode)

      const finalContent =
        mode === 'build' ? buildMessageWithPlanDraft(planDraft, content) : content

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
          agent.setInput(finalContent)
          setPendingMessage({ content: finalContent, mode })
        } catch {
          toast.error('Failed to create chat')
        }
        return
      }

      // Check if provider is available
      if (!provider) {
        toast.error('LLM provider not configured', {
          description: 'Please configure your LLM settings in the settings page.',
        })
        return
      }

      // Use agent hook
      agent.setInput(finalContent)
      setPendingMessage({ content: finalContent, mode })
    },
    [activeChat, projectId, createChatMutation, agent, provider, planDraft, setActiveChatId]
  )

  const handleResendInBuild = useCallback(
    async (content: string) => {
      await handleSendMessage(content, 'build')
    },
    [handleSendMessage]
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
        className="surface-1 flex h-12 shrink-0 items-center justify-between border-b border-border px-4"
      >
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>

          <PandaLogo size="sm" variant="icon" />

          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{project.name}</span>
            {isAnyJobRunning && <span className="flex h-2 w-2 animate-pulse bg-primary" />}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Show pending artifact count badge */}
          {pendingArtifactCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-2 rounded-none font-mono text-xs"
              onClick={() => setIsArtifactPanelOpen(true)}
            >
              <span className="flex h-2 w-2 animate-pulse rounded-full bg-white" />
              {pendingArtifactCount} Pending
            </Button>
          )}
          <AgentAutomationDialog
            projectId={projectId}
            projectPolicy={(project as any)?.agentPolicy}
            userDefaults={(settings as any)?.agentDefaults}
          />
          <Button
            variant={isArtifactPanelOpen ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-2 rounded-none font-mono text-xs"
            onClick={() => setIsArtifactPanelOpen(!isArtifactPanelOpen)}
          >
            <PanelRight className="h-4 w-4" />
            <span className="hidden sm:inline">Artifacts</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 rounded-none font-mono text-xs"
            onClick={handleResetWorkspace}
            title="Reset workspace (clear chat, artifacts, and plan)"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Workbench Panel */}
          <Panel defaultSize={70} minSize={40} className="flex flex-col">
            <Workbench
              projectId={projectId}
              files={files}
              selectedFilePath={selectedFilePath}
              onSelectFile={handleFileSelect}
              onCreateFile={handleFileCreate}
              onRenameFile={handleFileRename}
              onDeleteFile={handleFileDelete}
              onSaveFile={handleEditorSave}
            />
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-primary" />

          {/* Chat Panel - Always Visible */}
          <Panel defaultSize={30} minSize={25} maxSize={50} className="flex flex-col">
            <div className="surface-1 flex h-full flex-col border-l border-border">
              {/* Chat Header */}
              <div className="panel-header flex items-center gap-2" data-number="04">
                <Bot className="h-3.5 w-3.5 text-primary" />
                <span>Chat</span>
                {agent.status !== 'idle' &&
                  agent.status !== 'complete' &&
                  agent.status !== 'error' && (
                    <span className="ml-auto text-xs capitalize text-muted-foreground">
                      {agent.status.replace('_', ' ')}
                    </span>
                  )}
              </div>

              <PlanDraftPanel
                value={planDraft}
                onChange={setPlanDraft}
                onSaveNow={activeChat?._id ? savePlanDraftNow : undefined}
                isSaving={isPlanSaving}
                updatedAt={planUpdatedAt}
              />
              <RunTimelinePanel chatId={activeChat?._id} />

              {/* Messages */}
              <div className="flex-1 overflow-hidden">
                <MessageList
                  messages={chatMessages}
                  isStreaming={agent.isLoading}
                  onResendInBuild={handleResendInBuild}
                />
              </div>

              {/* Input */}
              <ChatInput
                mode={chatMode}
                onModeChange={setChatMode}
                onSendMessage={handleSendMessage}
                isStreaming={agent.isLoading}
                onStopStreaming={agent.stop}
              />
            </div>
          </Panel>
        </PanelGroup>

        {/* Floating Artifact Panel */}
        {isArtifactPanelOpen && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="absolute bottom-4 right-4 top-4 z-40"
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
      </div>
    </div>
  )
}
