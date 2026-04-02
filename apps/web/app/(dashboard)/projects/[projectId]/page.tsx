'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useConvex, useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

// Components
import { useHotkeys } from 'react-hotkeys-hook'
import { Breadcrumb, buildBreadcrumbItems } from '@/components/workbench/Breadcrumb'
import { mapLatestRunProgressSteps } from '@/components/chat/live-run-utils'
import { ComposerOverlay } from '@/components/chat/ComposerOverlay'
import { ProjectChatPanel } from '@/components/projects/ProjectChatPanel'
import { ProjectShareDialog } from '@/components/projects/ProjectShareDialog'
import { ProjectWorkspaceLayout } from '@/components/projects/ProjectWorkspaceLayout'
import { ReviewPanel } from '@/components/review/ReviewPanel'
import { Button } from '@/components/ui/button'
import { WorkspaceProvider, type WorkspaceContextValue } from '@/contexts/WorkspaceContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { ChevronLeft, RotateCcw, MoreHorizontal, PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import Link from 'next/link'

// UI Components
import { PandaLogo } from '@/components/ui/panda-logo'

// Hooks
import { useJobs } from '@/hooks/useJobs'
import { useAgent } from '@/hooks/useAgent'
import { useSidebar } from '@/hooks/useSidebar'
import { useProjectChatSession } from '@/hooks/useProjectChatSession'
import { useProjectMessageWorkflow } from '@/hooks/useProjectMessageWorkflow'
import { useProjectPlanDraft } from '@/hooks/useProjectPlanDraft'
import { useProjectWorkbenchFiles } from '@/hooks/useProjectWorkbenchFiles'
import { useProjectWorkspaceUi } from '@/hooks/useProjectWorkspaceUi'
import { useShortcutListener } from '@/hooks/useShortcuts'
import { useSpecDriftDetection } from '@/hooks/useSpecDriftDetection'
import {
  deriveWorkspaceArtifactPreviews,
  resolveArtifactPreviewNavigation,
  type WorkspaceArtifactPreview,
} from '@/components/workbench/artifact-preview'

import type { Message, MessageAnnotationInfo, PersistedRunEventInfo } from '@/components/chat/types'
import { canApprovePlan, canBuildFromPlan, type PlanStatus } from '@/lib/chat/planDraft'
import { isRateLimitError, getUserFacingAgentError } from '@/lib/chat/error-messages'
import { resolveBackgroundExecutionPolicy } from '@/lib/chat/backgroundExecution'
import { derivePlanCompletionStatus } from '@/lib/agent/plan-progress'
import type { AgentPolicy } from '@/lib/agent/automationPolicy'
import { normalizeChatMode, type ChatMode } from '@/lib/agent/prompt-library'
import type { LLMProvider } from '@/lib/llm/types'
import {
  applyArtifact,
  getPrimaryArtifactAction,
  type ArtifactAction,
} from '@/lib/artifacts/executeArtifact'

import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import {
  InspectorEvalsContent,
  InspectorMemoryContent,
  InspectorPlanContent,
  InspectorRunContent,
} from '@/components/projects/ProjectChatInspector'
import {
  createPlanArtifactWorkspaceTab,
  upsertPlanArtifactWorkspaceTab,
} from '@/components/workbench/PlanArtifactTab'
import { derivePlanningSessionDebugSummary } from '@/components/plan/PlanningSessionDebugCard'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'
import { appLog } from '@/lib/logger'
import {
  buildInlineChatFailureDisplay,
  resolveExplorerRevealTarget,
} from '@/lib/workbench-navigation'

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
  planStatus?: PlanStatus
  planSourceMessageId?: string
  planApprovedAt?: number
  planLastGeneratedAt?: number
  planBuildRunId?: Id<'agentRuns'>
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
  annotations?: MessageAnnotationInfo[]
  createdAt: number
}

interface AgentRunEvent extends PersistedRunEventInfo {
  _id: Id<'agentRunEvents'>
  _creationTime: number
  runId: Id<'agentRuns'>
  chatId: Id<'chats'>
  sequence: number
  createdAt: number
}

type ArtifactRecord = {
  _id: Id<'artifacts'>
  actions: ArtifactAction[]
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rejected'
  createdAt: number
}

type ChatInspectorTab = 'run' | 'plan' | 'artifacts' | 'memory' | 'evals'

// Add placeholder function if needed or safely remove usages

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

  const {
    isChatPanelOpen,
    setIsChatPanelOpen,
    selectedFilePath,
    setSelectedFilePath,
    selectedFileLocation,
    setSelectedFileLocation,
    openTabs,
    setOpenTabs,
    cursorPosition,
    setCursorPosition,
    isMobileLayout,
    isCompactDesktopLayout,
    mobilePrimaryPanel,
    setMobilePrimaryPanel,
    mobileUnreadCount,
    setMobileUnreadCount,
    isMobileKeyboardOpen,
    setIsMobileKeyboardOpen,
    isChatInspectorOpen,
    setIsChatInspectorOpen,
    chatInspectorTab,
    setChatInspectorTab,
    isSpecDrawerOpen,
    setIsSpecDrawerOpen,
    isSpecPanelOpen,
    setIsSpecPanelOpen,
    isShareDialogOpen,
    setIsShareDialogOpen,
  } = useProjectWorkspaceUi()

  const { activeSection, isFlyoutOpen, handleSectionChange, toggleFlyout } = useSidebar()

  const [automationMode, setAutomationMode] = useState<'manual' | 'auto'>('manual')
  const [contextualPrompt, setContextualPrompt] = useState<string | null>(null)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const lastAssistantMessageIdRef = useRef<string | null>(null)
  const seenPendingArtifactIdsRef = useRef<Set<string>>(new Set())
  const lastOpenedPlanArtifactRef = useRef<string | null>(null)
  const lastSyncedPlanArtifactRef = useRef<string | null>(null)
  const approvedPlanRunSessionsRef = useRef(new Map<string, string>())

  useHotkeys(
    'mod+i',
    (e) => {
      e.preventDefault()
      setIsComposerOpen((prev) => !prev)
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA'] }
  )

  // Fetch project data
  const project = useQuery(api.projects.get, { id: projectId })

  // Spec Drift Hook
  // The hook internally manages showing toasts via showSpecSyncToast
  useSpecDriftDetection({ projectId })

  // Fetch files
  const files = useQuery(api.files.list, { projectId }) as File[] | undefined

  // Fetch chats
  const chats = useQuery(api.chats.list, { projectId }) as Chat[] | undefined

  // Jobs (Terminal)
  const { isAnyJobRunning } = useJobs(projectId)
  const convex = useConvex()

  const projectAgentPolicy = readAgentPolicyField(project, 'agentPolicy')
  const createChatMutation = useMutation(api.chats.create)
  const updateChatMutation = useMutation(api.chats.update)
  const acceptPlanningSessionMutation = useMutation(api.planningSessions.acceptPlan)
  const markPlanningExecutionStateMutation = useMutation(api.planningSessions.markExecutionState)
  const upsertFileMutation = useMutation(api.files.upsert)
  const createAndExecuteJobMutation = useMutation(api.jobs.createAndExecute)
  const updateJobStatusMutation = useMutation(api.jobs.updateStatus)
  const updateArtifactStatusMutation = useMutation(api.artifacts.updateStatus)
  const {
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
  } = useProjectChatSession({
    projectId,
    chats,
    projectAgentPolicy,
  })
  const activePlanningSession = useQuery(
    api.planningSessions.getActiveByChat,
    activeChat ? { chatId: activeChat._id } : 'skip'
  ) as {
    sessionId: string
    chatId: Id<'chats'>
    status: string
    questions: Array<{
      id: string
      title: string
      prompt: string
      suggestions: Array<{
        id: string
        label: string
        description?: string
        recommended?: boolean
      }>
      allowFreeform: boolean
      order: number
    }>
    answers: Array<{
      questionId: string
      selectedOptionId?: string
      freeformValue?: string
      source: 'suggestion' | 'freeform'
      answeredAt: number
    }>
    generatedPlan?: GeneratedPlanArtifact
  } | null
  useShortcutListener()
  const persistedPlanDraft = activeChat?.planDraft ?? ''

  // Initialize agent hook when activeChat and provider exist
  // Skip the hook if provider is not available - we'll show an error when user tries to send
  const agent = useAgent({
    chatId: activeChat?._id as Id<'chats'>,
    projectId,
    projectName: project?.name,
    projectDescription: project?.description,
    mode: chatMode,
    architectBrainstormEnabled,
    provider: provider ?? FALLBACK_PROVIDER, // Stable fallback - checked before use
    model: selectedModel,
    planDraft: persistedPlanDraft,
    automationPolicy: effectiveAutomationPolicy,
    specApprovalMode: automationMode === 'auto' ? 'auto_approve' : 'interactive',
    onRunCreated: async ({ runId, approvedPlanExecution }) => {
      if (!approvedPlanExecution) return

      const planningSessionId = activePlanningSession?.sessionId ?? null
      if (planningSessionId) {
        approvedPlanRunSessionsRef.current.set(String(runId), planningSessionId)
        await markPlanningExecutionStateMutation({
          sessionId: planningSessionId,
          state: 'executing',
          runId,
        })
        return
      }

      if (!activeChat?._id) return
      await updateChatMutation({
        id: activeChat._id,
        planBuildRunId: runId,
        planStatus: 'executing',
      })
    },
    onRunCompleted: async ({ runId, outcome, completedPlanStepIndexes, planTotalSteps }) => {
      const nextPlanStatus = derivePlanCompletionStatus({
        planTotalSteps,
        completedPlanStepIndexes,
        runOutcome: outcome,
      })

      const planningSessionId = approvedPlanRunSessionsRef.current.get(String(runId))
      if (planningSessionId) {
        approvedPlanRunSessionsRef.current.delete(String(runId))
        await markPlanningExecutionStateMutation({
          sessionId: planningSessionId,
          state: nextPlanStatus,
        })
        return
      }

      if (!activeChat?._id || !activeChat.planBuildRunId) return
      if (activeChat.planBuildRunId !== runId) return
      if (activeChat.planStatus !== 'executing') return

      await updateChatMutation({
        id: activeChat._id,
        planStatus: nextPlanStatus,
      })
    },
  })
  const sendAgentMessage = agent.sendMessage

  const { planDraft, setPlanDraft, isSavingPlanDraft, handleSavePlanDraft, handleApprovePlan } =
    useProjectPlanDraft({
      activeChat,
      activePlanningSession,
      chatMode,
      architectBrainstormEnabled,
      agentStatus: agent.status,
      agentMessages: agent.messages,
      updateChatMutation,
      acceptPlanningSession: acceptPlanningSessionMutation,
    })

  const { handleSendMessage, handleSuggestedAction, handleBuildFromPlan, handleModeChange } =
    useProjectMessageWorkflow({
      projectId,
      activeChat,
      chatMode,
      setChatMode,
      planDraft,
      approvedPlanArtifact: activePlanningSession?.generatedPlan ?? null,
      activePlanningSessionId: activePlanningSession?.sessionId ?? null,
      providerAvailable: Boolean(provider),
      createChatMutation,
      updateChatMutation,
      markPlanningExecutionState: ({ sessionId, state }) =>
        markPlanningExecutionStateMutation({ sessionId, state }),
      sendAgentMessage,
      setActiveChatId,
      setMobilePrimaryPanel,
    })

  const artifactRecords = useQuery(
    api.artifacts.list,
    activeChat ? { chatId: activeChat._id } : 'skip'
  ) as ArtifactRecord[] | undefined
  const pendingArtifactPreviews = useMemo(
    () => deriveWorkspaceArtifactPreviews((artifactRecords ?? []).map((record) => ({ ...record }))),
    [artifactRecords]
  )
  const pendingArtifactPreview = useMemo<WorkspaceArtifactPreview | null>(() => {
    if (!selectedFilePath) return null
    return pendingArtifactPreviews.find((preview) => preview.filePath === selectedFilePath) ?? null
  }, [pendingArtifactPreviews, selectedFilePath])

  const activePlanArtifact = activePlanningSession?.generatedPlan ?? null
  const planningDebug = useMemo(() => {
    if (!activePlanningSession) return null
    return derivePlanningSessionDebugSummary({
      sessionId: activePlanningSession.sessionId,
      questions: activePlanningSession.questions,
      answers: activePlanningSession.answers,
      generatedPlan: activePlanningSession.generatedPlan ?? null,
      openTabPaths: openTabs.map((tab) => tab.path),
    })
  }, [activePlanningSession, openTabs])
  const activePlanArtifactOpenKey = activePlanArtifact
    ? `${activePlanArtifact.sessionId}:${activePlanArtifact.generatedAt}`
    : null
  const activePlanArtifactRevisionKey = activePlanArtifact
    ? `${activePlanArtifact.sessionId}:${activePlanArtifact.generatedAt}:${activePlanArtifact.status}`
    : null

  useEffect(() => {
    if (!activePlanArtifact || !activePlanArtifactOpenKey || !activePlanArtifactRevisionKey) return
    if (lastSyncedPlanArtifactRef.current === activePlanArtifactRevisionKey) return

    const nextPlanTab = createPlanArtifactWorkspaceTab(activePlanArtifact)

    setOpenTabs((prev) => upsertPlanArtifactWorkspaceTab(prev, activePlanArtifact))
    lastSyncedPlanArtifactRef.current = activePlanArtifactRevisionKey

    if (lastOpenedPlanArtifactRef.current !== activePlanArtifactOpenKey) {
      setSelectedFilePath(nextPlanTab.path)
      setSelectedFileLocation(null)
      setCursorPosition(null)
      setMobilePrimaryPanel('workspace')
      lastOpenedPlanArtifactRef.current = activePlanArtifactOpenKey
    }
  }, [
    activePlanArtifact,
    activePlanArtifactOpenKey,
    activePlanArtifactRevisionKey,
    setCursorPosition,
    setMobilePrimaryPanel,
    setOpenTabs,
    setSelectedFileLocation,
    setSelectedFilePath,
  ])

  // Reset workspace handler
  const handleSelectChat = useCallback(
    (chatId: Id<'chats'>) => {
      setActiveChatId(chatId)
    },
    [setActiveChatId]
  )

  const handleNewChat = useCallback(async () => {
    const id = await createChatMutation({ projectId, title: 'New Chat', mode: chatMode })
    setActiveChatId(id)
  }, [createChatMutation, projectId, chatMode, setActiveChatId])

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
    // Show confirmation
    toast.success('Workspace reset', {
      description: 'Chat, artifacts, and plan draft have been cleared',
    })
  }, [agent, setChatMode, setPlanDraft])

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
        convexMessages?.map((msg) => {
          const firstAnnotation = msg.annotations?.[0]
          return {
            _id: msg._id,
            role: msg.role,
            content: msg.content,
            reasoningContent: firstAnnotation?.reasoningSummary,
            annotations: firstAnnotation
              ? {
                  ...firstAnnotation,
                  mode: normalizeChatMode(firstAnnotation.mode, chatMode),
                }
              : undefined,
            toolCalls: firstAnnotation?.toolCalls,
            createdAt: msg.createdAt,
          }
        }) || []
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
  const snapshotRunEvents = useMemo(
    () => (runEvents ?? []).filter((event) => event.type === 'snapshot'),
    [runEvents]
  )
  const subagentToolCalls = useMemo(
    () =>
      chatMessages
        .flatMap((message) => message.toolCalls ?? [])
        .filter((call) => call.name === 'task'),
    [chatMessages]
  )
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
  const backgroundExecutionPolicy = useMemo(
    () => resolveBackgroundExecutionPolicy(chatMode),
    [chatMode]
  )
  const inlineRateLimitError = useMemo(() => {
    if (!agent.error || !isRateLimitError(agent.error)) return null
    return getUserFacingAgentError(agent.error)
  }, [agent.error])

  // Note: Inspector no longer auto-opens on agent start - user opens it manually

  const {
    handleFileSelect,
    handleTabClose,
    handleFileCreate,
    handleFileRename,
    handleFileDelete,
    handleEditorSave,
    handleEditorDirtyChange,
  } = useProjectWorkbenchFiles({
    projectId,
    files,
    selectedFilePath,
    setSelectedFilePath,
    setSelectedFileLocation,
    setCursorPosition,
    setOpenTabs,
    setMobilePrimaryPanel,
  })

  useEffect(() => {
    seenPendingArtifactIdsRef.current.clear()
  }, [activeChat?._id])

  useEffect(() => {
    if (pendingArtifactPreviews.length === 0) return

    const newPreviews = pendingArtifactPreviews.filter(
      (preview) => !seenPendingArtifactIdsRef.current.has(preview.artifactId)
    )

    if (newPreviews.length === 0) return

    for (const preview of newPreviews) {
      seenPendingArtifactIdsRef.current.add(preview.artifactId)
    }

    const targetPreview = newPreviews[0]
    const navigation = resolveArtifactPreviewNavigation({
      preview: targetPreview,
      openTabs,
      selectedFilePath,
    })

    if (navigation.shouldOpenTab) {
      setOpenTabs((prev) => {
        if (prev.some((tab) => tab.path === targetPreview.filePath)) return prev
        return [...prev, { path: targetPreview.filePath }]
      })
    }

    if (navigation.shouldSelectFile) {
      setMobilePrimaryPanel('workspace')
      setSelectedFilePath(targetPreview.filePath)
      setSelectedFileLocation(null)
      setCursorPosition(null)
    }
  }, [
    openTabs,
    pendingArtifactPreviews,
    selectedFilePath,
    setCursorPosition,
    setMobilePrimaryPanel,
    setOpenTabs,
    setSelectedFileLocation,
    setSelectedFilePath,
  ])

  const handleApplyPendingArtifact = useCallback(
    async (artifactId: string) => {
      const record = artifactRecords?.find((artifact) => artifact._id === artifactId)
      const action = record ? getPrimaryArtifactAction(record) : null
      if (!record || !action) return

      try {
        await applyArtifact({
          artifactId: record._id,
          action,
          projectId,
          convex,
          upsertFile: upsertFileMutation,
          createAndExecuteJob: createAndExecuteJobMutation,
          updateJobStatus: (jobId, status, updates) =>
            updateJobStatusMutation({
              id: jobId,
              status,
              ...updates,
            }),
          updateArtifactStatus: updateArtifactStatusMutation,
        })
        toast.success('Applied pending artifact', {
          description:
            action.type === 'file_write' ? action.payload.filePath : action.payload.command,
        })
      } catch (error) {
        toast.error('Failed to apply pending artifact', {
          description: error instanceof Error ? error.message : String(error),
        })
      }
    },
    [
      artifactRecords,
      convex,
      createAndExecuteJobMutation,
      projectId,
      updateArtifactStatusMutation,
      updateJobStatusMutation,
      upsertFileMutation,
    ]
  )

  const handleRejectPendingArtifact = useCallback(
    async (artifactId: string) => {
      await updateArtifactStatusMutation({
        id: artifactId as Id<'artifacts'>,
        status: 'rejected',
      })
    },
    [updateArtifactStatusMutation]
  )

  const openReviewTab = useCallback(
    (tab: ChatInspectorTab) => {
      setChatInspectorTab(tab)
      if (isMobileLayout) {
        setMobilePrimaryPanel('review')
        setIsChatInspectorOpen(false)
        return
      }
      setIsChatInspectorOpen(true)
    },
    [isMobileLayout, setChatInspectorTab, setIsChatInspectorOpen, setMobilePrimaryPanel]
  )

  useEffect(() => {
    if (!isMobileLayout || mobilePrimaryPanel === 'chat') {
      setMobileUnreadCount(0)
    }
  }, [isMobileLayout, mobilePrimaryPanel, setMobileUnreadCount])

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
  }, [chatMessages, isMobileLayout, mobilePrimaryPanel, setMobileUnreadCount])

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
  }, [isMobileLayout, setIsMobileKeyboardOpen])

  const selectedChatModel = uiSelectedModel || selectedModel
  const chatPanelContent = (
    <ProjectChatPanel
      projectId={projectId}
      automationMode={automationMode}
      onAutomationModeChange={setAutomationMode}
      activeChatId={activeChat?._id}
      activeChatPlanStatus={activeChat?.planStatus}
      activeChatPlanUpdatedAt={activeChat?.planUpdatedAt}
      activeChatPlanLastGeneratedAt={activeChat?.planLastGeneratedAt}
      activeChatExists={Boolean(activeChat?._id)}
      chatMessages={chatMessages}
      chatMode={chatMode}
      architectBrainstormEnabled={architectBrainstormEnabled}
      onArchitectBrainstormEnabledChange={setArchitectBrainstormEnabled}
      onModeChange={handleModeChange}
      onSendMessage={handleSendMessage}
      onSuggestedAction={handleSuggestedAction}
      isStreaming={agent.isLoading}
      onStopStreaming={agent.stop}
      filePaths={files?.map((f) => f.path) ?? []}
      model={selectedChatModel}
      onModelChange={setUiSelectedModel}
      availableModels={availableModels}
      variant={reasoningVariant}
      onVariantChange={setReasoningVariant}
      supportsReasoning={supportsReasoning}
      specTier={specTier}
      onSpecTierChange={setSpecTier}
      inlineRateLimitError={inlineRateLimitError}
      onToggleInspector={() => {
        if (isMobileLayout) {
          openReviewTab(chatInspectorTab as ChatInspectorTab)
          return
        }
        setIsChatInspectorOpen((prev) => !prev)
      }}
      onOpenHistory={() => {
        openReviewTab('run')
      }}
      onOpenShare={() => setIsShareDialogOpen(true)}
      onResetWorkspace={handleResetWorkspace}
      onNewChat={() => {
        void handleNewChat()
      }}
      planDraft={planDraft}
      onPlanReview={() => {
        openReviewTab('plan')
      }}
      onPlanApprove={() => {
        void handleApprovePlan()
      }}
      onBuildFromPlan={() => {
        void handleBuildFromPlan()
      }}
      planApproveDisabled={!canApprovePlan(activeChat?.planStatus, planDraft) || agent.isLoading}
      planBuildDisabled={!canBuildFromPlan(activeChat?.planStatus, planDraft) || agent.isLoading}
      showInlinePlanReview={backgroundExecutionPolicy.showInlinePlanReview}
      pendingSpec={agent.pendingSpec}
      onSpecApprove={agent.approvePendingSpec}
      onSpecEdit={() => setIsSpecPanelOpen(true)}
      onSpecCancel={agent.cancelPendingSpec}
      showInlineSpecReview={backgroundExecutionPolicy.showInlineSpecReview}
      currentSpecTier={agent.currentSpec?.tier || specTier}
      isSpecPanelOpen={isSpecPanelOpen}
      onCloseSpecPanel={() => setIsSpecPanelOpen(false)}
      onEditPendingSpec={agent.updatePendingSpecDraft}
      onExecutePendingSpec={(spec) => {
        agent.approvePendingSpec(spec)
        setIsSpecPanelOpen(false)
      }}
      isMobileLayout={isMobileLayout}
      isInspectorOpen={false}
      inspectorTab={chatInspectorTab as ChatInspectorTab}
      onInspectorOpenChange={() => {}}
      onInspectorTabChange={() => {}}
      liveSteps={liveRunSteps}
      tracePersistenceStatus={agent.tracePersistenceStatus}
      onOpenFile={handleFileSelect}
      onOpenArtifacts={() => {
        openReviewTab('artifacts')
      }}
      currentSpec={agent.currentSpec}
      onSpecClick={() => setIsSpecDrawerOpen(true)}
      onPlanClick={() => {
        openReviewTab('plan')
      }}
      onResumeRuntimeSession={agent.resumeRuntimeSession}
      snapshotEvents={snapshotRunEvents}
      subagentToolCalls={subagentToolCalls}
      onPlanDraftChange={setPlanDraft}
      onSavePlanDraft={() => {
        void handleSavePlanDraft()
      }}
      isSavingPlanDraft={isSavingPlanDraft}
      memoryBank={agent.memoryBank}
      onSaveMemoryBank={agent.updateMemoryBank}
      lastUserPrompt={latestUserPrompt}
      onRunEvalScenario={agent.runEvalScenario}
      renderInspectorInline={false}
      contextualPrompt={contextualPrompt}
      onContextualPromptHandled={() => setContextualPrompt(null)}
    />
  )

  const reviewPanelContent = (
    <ReviewPanel
      activeTab={chatInspectorTab}
      onTabChange={(tab) => setChatInspectorTab(tab as ChatInspectorTab)}
      runContent={
        <InspectorRunContent
          chatId={activeChat?._id}
          liveSteps={liveRunSteps}
          isStreaming={agent.isLoading}
          tracePersistenceStatus={agent.tracePersistenceStatus}
          onOpenFile={handleFileSelect}
          onOpenArtifacts={() => openReviewTab('artifacts')}
          currentSpec={agent.currentSpec}
          planStatus={activeChat?.planStatus}
          planDraft={planDraft}
          onSpecClick={() => setIsSpecDrawerOpen(true)}
          onPlanClick={() => openReviewTab('plan')}
          onResumeRuntimeSession={agent.resumeRuntimeSession}
          planningDebug={planningDebug}
          snapshotEvents={snapshotRunEvents}
          subagentToolCalls={subagentToolCalls}
        />
      }
      planContent={
        <InspectorPlanContent
          planDraft={planDraft}
          planStatus={activeChat?.planStatus}
          onPlanDraftChange={setPlanDraft}
          onSavePlanDraft={() => {
            void handleSavePlanDraft()
          }}
          onApprovePlan={() => {
            void handleApprovePlan()
          }}
          onBuildFromPlan={() => {
            void handleBuildFromPlan()
          }}
          isSavingPlanDraft={isSavingPlanDraft}
          lastSavedAt={activeChat?.planUpdatedAt}
          lastGeneratedAt={activeChat?.planLastGeneratedAt}
          approveDisabled={!canApprovePlan(activeChat?.planStatus, planDraft) || agent.isLoading}
          buildDisabled={!canBuildFromPlan(activeChat?.planStatus, planDraft) || agent.isLoading}
        />
      }
      artifactsContent={
        <ArtifactPanel projectId={projectId} chatId={activeChat?._id} position="right" />
      }
      memoryContent={
        <InspectorMemoryContent
          memoryBank={agent.memoryBank}
          onSaveMemoryBank={agent.updateMemoryBank}
        />
      }
      evalsContent={
        <InspectorEvalsContent
          projectId={projectId}
          chatId={activeChat?._id}
          lastUserPrompt={latestUserPrompt}
          lastAssistantReply={latestAssistantReply}
          onRunEvalScenario={agent.runEvalScenario}
        />
      }
    />
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

  const workspaceContextValue: WorkspaceContextValue = {
    selectedFilePath,
    setSelectedFilePath,
    selectedFileLocation,
    setSelectedFileLocation,
    openTabs,
    setOpenTabs,
    cursorPosition,
    setCursorPosition,
    activeSection,
    isFlyoutOpen,
    handleSectionChange,
    toggleFlyout,
    isMobileLayout,
    isCompactDesktopLayout,
    mobilePrimaryPanel,
    setMobilePrimaryPanel,
    isChatPanelOpen,
    setIsChatPanelOpen,
    projectId,
    activeChatId: activeChat?._id,
    chatMode,
    onSelectChat: handleSelectChat,
    onNewChat: () => {
      void handleNewChat()
    },
  }

  return (
    <WorkspaceProvider value={workspaceContextValue}>
      <div className="fixed inset-0 top-0 z-10 flex flex-col overflow-hidden bg-background">
        <ProjectShareDialog
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          chatId={activeChat?._id}
          chatTitle={activeChat?.title}
        />
        {/* Top Bar - Unified Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="surface-1 flex h-14 shrink-0 items-center justify-between border-b border-border px-4"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {/* Sidebar Toggle + Panda Wordmark */}
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-none p-0"
                onClick={toggleFlyout}
                title={isFlyoutOpen ? 'Close sidebar' : 'Open sidebar'}
                aria-label={isFlyoutOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                {isFlyoutOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>
              <Link href="/" className="flex shrink-0 items-center">
                <PandaLogo size="md" variant="icon" />
              </Link>
            </div>

            <div className="h-6 w-px bg-border" />

            <Link href="/projects" className="shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1 rounded-none font-mono text-xs"
                aria-label="Back to projects"
                title="Back to projects"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Projects</span>
              </Button>
            </Link>

            <div className="h-6 w-px bg-border" />

            <Breadcrumb
              projectName={project.name}
              projectId={projectId}
              items={buildBreadcrumbItems(selectedFilePath)}
              onRevealInExplorer={(folderPath) => {
                const revealTarget = resolveExplorerRevealTarget({
                  folderPath,
                  files: files ?? [],
                })

                if (!revealTarget) return

                handleSectionChange('explorer')
                if (!isFlyoutOpen) toggleFlyout()
                setSelectedFilePath(revealTarget)
                setSelectedFileLocation(null)
                setCursorPosition(null)
              }}
            />

            {isAnyJobRunning && (
              <span
                className="ml-2 flex h-2 w-2 animate-pulse rounded-full bg-primary"
                title="Jobs running"
              />
            )}
          </div>

          <div className="flex items-center gap-1">
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
        </motion.div>

        <ProjectWorkspaceLayout
          projectId={projectId}
          activeChatId={activeChat?._id}
          files={files}
          selectedFilePath={selectedFilePath}
          selectedFileLocation={selectedFileLocation}
          openTabs={openTabs}
          onSelectFile={handleFileSelect}
          onCloseTab={handleTabClose}
          onCreateFile={handleFileCreate}
          onRenameFile={handleFileRename}
          onDeleteFile={handleFileDelete}
          onSaveFile={handleEditorSave}
          onEditorDirtyChange={handleEditorDirtyChange}
          isMobileLayout={isMobileLayout}
          isCompactDesktopLayout={isCompactDesktopLayout}
          mobilePrimaryPanel={mobilePrimaryPanel}
          onMobilePrimaryPanelChange={setMobilePrimaryPanel}
          mobileUnreadCount={mobileUnreadCount}
          isMobileKeyboardOpen={isMobileKeyboardOpen}
          chatPanel={chatPanelContent}
          reviewPanel={reviewPanelContent}
          isReviewPanelOpen={isChatInspectorOpen}
          onReviewPanelOpenChange={setIsChatInspectorOpen}
          isChatPanelOpen={isChatPanelOpen}
          pendingArtifactPreview={pendingArtifactPreview}
          onApplyPendingArtifact={handleApplyPendingArtifact}
          onRejectPendingArtifact={handleRejectPendingArtifact}
          chatMode={chatMode}
          onModeChange={handleModeChange}
          cursorPosition={cursorPosition}
          isStreaming={agent.isLoading}
          currentSpec={agent.currentSpec}
          isSpecDrawerOpen={isSpecDrawerOpen}
          onSpecDrawerOpenChange={setIsSpecDrawerOpen}
          onContextualChat={(selection, filePath) => {
            const ext = filePath.split('.').pop() || 'text'
            const prompt = `\`\`\`${ext}\n// ${filePath}\n${selection}\n\`\`\``
            setContextualPrompt(prompt)
            if (!isChatPanelOpen) {
              setIsChatPanelOpen(true)
            }
            if (isMobileLayout) {
              setMobilePrimaryPanel('chat')
            }
          }}
          onInlineChat={async (prompt, selection, filePath) => {
            try {
              const result = await agent.runEvalScenario({
                prompt: `The user wants to edit ${filePath}.\n${selection ? `Selected text:\n\`\`\`\n${selection}\n\`\`\`\n` : ''}User request: ${prompt}\n\nReturn ONLY the new code that should replace the selected text (or be inserted at the cursor). Do NOT wrap it in markdown block quotes. Do NOT add any explanations.`,
                mode: 'code',
              })
              if (result.error) throw new Error(result.error)

              let output = result.output
              if (output.startsWith('```')) {
                const lines = output.split('\n')
                if (lines.length > 2) {
                  output = lines.slice(1, -1).join('\n')
                }
              }
              return output
            } catch (err) {
              const failure = buildInlineChatFailureDisplay(err)
              appLog.error('[projects/[projectId]] Inline chat failed', {
                projectId,
                filePath,
                error:
                  err instanceof Error
                    ? {
                        name: err.name,
                        message: err.message,
                        stack: err.stack,
                      }
                    : err,
              })
              toast.error(failure.title, {
                description: failure.description,
              })
              return null
            }
          }}
        />
        <ComposerOverlay
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          onSubmit={(prompt, ctx) => handleSendMessage(prompt, 'build', ctx)}
          isStreaming={agent.isLoading}
        />
      </div>
    </WorkspaceProvider>
  )
}
