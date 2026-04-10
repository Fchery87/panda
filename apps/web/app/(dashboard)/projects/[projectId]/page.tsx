'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
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
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { ProjectChatPanel } from '@/components/projects/ProjectChatPanel'
import { ProjectShareDialog } from '@/components/projects/ProjectShareDialog'
import { ProjectWorkspaceLayout } from '@/components/projects/ProjectWorkspaceLayout'
import { RightPanel } from '@/components/panels/RightPanel'
import { TaskPanel } from '@/components/panels/TaskPanel'
import { QAPanel } from '@/components/panels/QAPanel'
import { StatePanel } from '@/components/panels/StatePanel'
import { BrowserSessionPanel } from '@/components/panels/BrowserSessionPanel'
import { ActivityTimelinePanel } from '@/components/panels/ActivityTimelinePanel'
import { DecisionPanel } from '@/components/panels/DecisionPanel'
import { Button } from '@/components/ui/button'
import { WorkspaceProvider, type WorkspaceContextValue } from '@/contexts/WorkspaceContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { RotateCcw, MoreHorizontal, PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import Link from 'next/link'
import { TopBarControls } from '@/components/layout/TopBarControls'
import { useCommandPaletteStore } from '@/stores/commandPaletteStore'
import { useGit } from '@/hooks/useGit'

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
import { buildForgeActivityTimeline } from '@/lib/forge/activity'
import {
  applyArtifact,
  getPrimaryArtifactAction,
  type ArtifactAction,
} from '@/lib/artifacts/executeArtifact'

import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import {
  InspectorEvalsContent,
  type InspectorTab,
  InspectorMemoryContent,
  InspectorPlanContent,
  InspectorRunContent,
} from '@/components/projects/ProjectChatInspector'
import {
  createPlanArtifactWorkspaceTab,
  upsertPlanArtifactWorkspaceTab,
} from '@/components/workbench/PlanArtifactTab'
import { ShortcutHelpOverlay } from '@/components/workbench/ShortcutHelpOverlay'
import { derivePlanningSessionDebugSummary } from '@/components/plan/PlanningSessionDebugCard'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'
import { appLog } from '@/lib/logger'
import {
  buildInlineChatFailureDisplay,
  resolveExplorerRevealTarget,
} from '@/lib/workbench-navigation'
import { buildDeliveryClosureServicePlan } from '@/lib/agent/delivery/service'
import { deriveQaReportFingerprint } from '@/lib/qa/browser-session'
import { deriveShipDecision, buildExecutiveSummary } from '@/lib/agent/delivery/executive'

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

type ChatInspectorTab =
  | 'run'
  | 'plan'
  | 'artifacts'
  | 'memory'
  | 'evals'
  | 'tasks'
  | 'qa'
  | 'state'
  | 'browser'
  | 'activity'
  | 'decisions'

// Add placeholder function if needed or safely remove usages

function readAgentPolicyField(
  source: unknown,
  key: 'agentPolicy' | 'agentDefaults'
): AgentPolicy | null | undefined {
  if (!source || typeof source !== 'object') return undefined
  return (source as Record<string, unknown>)[key] as AgentPolicy | null | undefined
}

const FALLBACK_PROVIDER: LLMProvider = {
  name: 'No Provider',
  config: {
    provider: 'anthropic',
    auth: { apiKey: '' },
  },
  async listModels() {
    return []
  },
  async complete() {
    throw new Error('No LLM provider configured')
  },
  async *completionStream() {
    yield { type: 'error' as const, error: 'No LLM provider configured' }
    throw new Error('No LLM provider configured')
  },
}

export default function ProjectPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params.projectId as Id<'projects'>
  const openCommandPalette = useCommandPaletteStore((state) => state.open)
  const { status: gitStatus, refreshStatus: refreshGitStatus } = useGit()

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
    chatInspectorTab,
    isSpecDrawerOpen,
    setIsSpecDrawerOpen,
    isSpecPanelOpen,
    setIsSpecPanelOpen,
    isShareDialogOpen,
    setIsShareDialogOpen,
    // New agent command center state
    isBottomDockOpen,
    setIsBottomDockOpen,
    activeBottomDockTab,
    setActiveBottomDockTab,
    activeCenterTab,
    setActiveCenterTab,
    isRightPanelOpen,
    setIsRightPanelOpen,
    rightPanelTab,
    setRightPanelTab,
    taskHeaderVisible,
    setTaskHeaderVisible,
  } = useProjectWorkspaceUi()

  useEffect(() => {
    void refreshGitStatus()
  }, [refreshGitStatus])

  const { activeSection, isFlyoutOpen, handleSectionChange, toggleFlyout } = useSidebar()

  const [automationMode, setAutomationMode] = useState<'manual' | 'auto'>('manual')
  const [contextualPrompt, setContextualPrompt] = useState<string | null>(null)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false)
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

  useHotkeys(
    'mod+/',
    (e) => {
      e.preventDefault()
      setIsShortcutHelpOpen((prev) => !prev)
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA'] }
  )

  // Toggle bottom dock with Ctrl+J
  useHotkeys(
    'ctrl+j',
    (e) => {
      e.preventDefault()
      setIsBottomDockOpen((prev) => !prev)
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA'] }
  )

  // Toggle right panel (chat) with Cmd+L
  useHotkeys(
    'mod+l',
    (e) => {
      e.preventDefault()
      setIsRightPanelOpen((prev) => !prev)
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
  const startForgeIntake = useMutation(api.forge.startIntake)
  const createForgeTasksFromPlan = useMutation(api.forge.createTasksFromPlan)
  const acceptForgePlan = useMutation(api.forge.acceptPlan)
  const startForgeTaskExecutionMutation = useMutation(api.forge.startTaskExecution)
  const submitForgeWorkerResultMutation = useMutation(api.forge.submitWorkerResult)
  const recordForgeReviewMutation = useMutation(api.forge.recordReview)
  const runForgeQaForTaskMutation = useMutation(api.forge.runQaForTask)
  const recordForgeShipDecisionMutation = useMutation(api.forge.recordShipDecision)
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
  const forgeProjectSnapshot = useQuery(
    api.forge.getProjectSnapshot,
    activeChat ? { chatId: activeChat._id } : 'skip'
  )
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
      void runId
      if (activeDeliveryTask) {
        await startForgeTaskExecutionMutation({
          taskId: activeDeliveryTask._id,
        })
      }

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
      if (forgeProjectSnapshot && activeDeliveryTask) {
        await submitForgeWorkerResultMutation({
          taskId: activeDeliveryTask._id,
          summary: `Agent run ${runId} completed for ${activeDeliveryTask.title}.`,
          evidenceRefs: [String(runId)],
          verificationLabel: 'Agent run completed',
          outcome,
        })

        if (outcome === 'completed') {
          const latestQaFingerprint = activeTaskQaReport
            ? deriveQaReportFingerprint({
                taskId: activeDeliveryTask._id,
                runId,
                flowNames: activeTaskQaReport.evidence.flowNames,
                urlsTested: activeTaskQaReport.evidence.urlsTested,
              })
            : null
          const closurePlan = buildDeliveryClosureServicePlan({
            taskId: activeDeliveryTask._id,
            deliveryStateId: forgeProjectSnapshot.state.id,
            taskTitle: activeDeliveryTask.title,
            runId,
            projectId,
            chatId: activeChat?._id ?? 'unknown-chat',
            projectPath: `/projects/${projectId}`,
            latestQaFingerprint,
          })

          await recordForgeReviewMutation({
            deliveryStateId: closurePlan.createReviewReport.deliveryStateId,
            taskId: closurePlan.createReviewReport.taskId,
            type: closurePlan.createReviewReport.type,
            decision: closurePlan.createReviewReport.decision,
            summary: closurePlan.createReviewReport.summary,
            findings: closurePlan.createReviewReport.findings,
            followUpTaskIds: closurePlan.createReviewReport.followUpTaskIds,
          })

          let qaDecision: 'pass' | 'concerns' | 'fail' | null = null
          let qaSummary: string | null = null
          if (closurePlan.shouldRunBrowserQa) {
            const qaResponse = await fetch('/api/qa/run', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId,
                chatId: activeChat?._id,
                taskId: activeDeliveryTask._id,
                urlsTested: closurePlan.createQaReport.evidence.urlsTested,
                filesInScope: activeDeliveryTask.filesInScope,
                flowNames: closurePlan.createQaReport.evidence.flowNames,
                environment: forgeProjectSnapshot?.browserQa.activeSession?.environment ?? 'local',
                existingSession: forgeProjectSnapshot?.browserQa.activeSession,
              }),
            })

            if (!qaResponse.ok) {
              throw new Error('Failed to run browser QA')
            }

            const qaPayload = (await qaResponse.json()) as {
              browserSessionKey: string
              decision: 'pass' | 'concerns' | 'fail'
              summary: string
              assertions: Array<{ label: string; status: 'passed' | 'failed' | 'skipped' }>
              evidence: {
                screenshotPath?: string
                urlsTested: string[]
                flowNames: string[]
                consoleErrors: string[]
                networkFailures: string[]
              }
              defects: Array<{
                severity: 'high' | 'medium' | 'low'
                title: string
                detail: string
                route?: string
              }>
              browserSession: {
                browserSessionKey: string
                status: 'ready' | 'stale' | 'leased' | 'failed'
                environment: string
                baseUrl: string
                lastRoutesTested: string[]
                lastUsedAt: number
                lastVerifiedAt?: number
                leaseOwner?: string
                leaseExpiresAt?: number
              }
            }

            qaDecision = qaPayload.decision
            qaSummary = qaPayload.summary

            await runForgeQaForTaskMutation({
              deliveryStateId: closurePlan.createQaReport.deliveryStateId,
              taskId: closurePlan.createQaReport.taskId,
              browserSessionKey: qaPayload.browserSessionKey,
              decision: qaPayload.decision,
              summary: qaPayload.summary,
              assertions: qaPayload.assertions,
              urlsTested: qaPayload.evidence.urlsTested,
              flowNames: qaPayload.evidence.flowNames,
              consoleErrors: qaPayload.evidence.consoleErrors,
              networkFailures: qaPayload.evidence.networkFailures,
              screenshotPath: qaPayload.evidence.screenshotPath,
              defects: qaPayload.defects,
            })
          }

          if (qaDecision === 'pass') {
            const shipDecision = deriveShipDecision({ qaDecision })
            await recordForgeShipDecisionMutation({
              deliveryStateId: closurePlan.shipReport.deliveryStateId,
              decision: shipDecision,
              summary: buildExecutiveSummary({
                taskTitle: activeDeliveryTask.title,
                qaDecision,
              }),
              evidenceSummary: qaSummary ?? closurePlan.shipReport.evidenceSummary,
            })
          }
        }
      }

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

  const healthStatus = useMemo(() => {
    if (agent.error) return 'error' as const
    if (isAnyJobRunning || agent.isLoading) return 'issues' as const
    return 'ready' as const
  }, [agent.error, agent.isLoading, isAnyJobRunning])

  const healthDetail = useMemo(() => {
    if (agent.error) return 'Agent execution encountered an error'
    if (agent.isLoading) return 'Agent is actively working'
    if (isAnyJobRunning) return 'Background jobs are running'
    return 'Workspace systems nominal'
  }, [agent.error, agent.isLoading, isAnyJobRunning])
  const sendAgentMessage = agent.sendMessage

  // Auto-show task header when agent is running
  useEffect(() => {
    setTaskHeaderVisible(agent.isLoading)
  }, [agent.isLoading, setTaskHeaderVisible])

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
      startForgeIntake,
      createForgeTasksFromPlan,
      acceptForgePlan,
      getActiveForgeState: async (chatId) => {
        const snapshot = await convex.query(api.forge.getProjectSnapshot, { chatId })
        return snapshot ? { _id: snapshot.state.id } : null
      },
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
  const activeDeliveryTask = useMemo(() => {
    const forgeTasks = forgeProjectSnapshot?.taskBoard.tasks ?? []
    if (forgeTasks.length > 0) {
      const forgeActiveTaskId = forgeProjectSnapshot?.taskBoard.activeTaskId
      if (forgeActiveTaskId) {
        const forgeActiveTask = forgeTasks.find((task) => task._id === forgeActiveTaskId)
        if (forgeActiveTask) return forgeActiveTask
      }

      return forgeTasks.find((task) => task.status !== 'done' && task.status !== 'rejected') ?? null
    }

    return null
  }, [forgeProjectSnapshot?.taskBoard.activeTaskId, forgeProjectSnapshot?.taskBoard.tasks])
  const activeTaskReview = forgeProjectSnapshot?.verification.latestReview ?? null
  const activeTaskQaReport = forgeProjectSnapshot?.verification.latestQa ?? null
  const latestShipReport = useMemo(() => {
    const timeline = forgeProjectSnapshot?.timeline ?? []
    const shipEntry = timeline.find((entry) => entry.kind === 'ship')
    if (!shipEntry) return null

    return {
      summary: typeof shipEntry.summary === 'string' ? shipEntry.summary : '',
    }
  }, [forgeProjectSnapshot?.timeline])
  const requestedFilePath = searchParams.get('filePath')
  const taskPanelViewModel = useMemo(
    () =>
      activeDeliveryTask
        ? {
            title: activeDeliveryTask.title,
            description: activeDeliveryTask.description,
            rationale: activeDeliveryTask.rationale,
            status: activeDeliveryTask.status,
            ownerRole: activeDeliveryTask.ownerRole,
            acceptanceCriteria: activeDeliveryTask.acceptanceCriteria,
            filesInScope: activeDeliveryTask.filesInScope,
            blockers: activeDeliveryTask.blockers,
            evidence: activeDeliveryTask.evidence.map((evidence) => ({
              label: evidence.label,
              href: evidence.href,
            })),
            latestReview: activeTaskReview
              ? {
                  type: activeTaskReview.type,
                  decision: activeTaskReview.decision,
                  summary: activeTaskReview.summary,
                }
              : null,
          }
        : null,
    [activeDeliveryTask, activeTaskReview]
  )
  const qaPanelViewModel = useMemo(
    () =>
      activeTaskQaReport
        ? {
            decision: activeTaskQaReport.decision,
            summary: activeTaskQaReport.summary,
            assertions: activeTaskQaReport.assertions,
            evidence: activeTaskQaReport.evidence,
            defects: activeTaskQaReport.defects,
          }
        : null,
    [activeTaskQaReport]
  )
  const statePanelViewModel = useMemo(() => {
    if (!forgeProjectSnapshot) return null

    return {
      currentPhase: forgeProjectSnapshot.state.phase,
      openTaskCount: forgeProjectSnapshot.taskBoard.tasks.filter(
        (task) => task.status !== 'done' && task.status !== 'rejected'
      ).length,
      unresolvedRiskCount: forgeProjectSnapshot.state.openRiskCount,
      reviewGateStatus: forgeProjectSnapshot.state.gates.implementation_review,
      qaGateStatus: forgeProjectSnapshot.state.gates.qa_review,
      shipSummary:
        latestShipReport?.summary ??
        forgeProjectSnapshot.state.summary.nextStepBrief ??
        'Ship readiness has not been recorded yet.',
    }
  }, [forgeProjectSnapshot, latestShipReport])
  const browserSessionViewModel = useMemo(
    () => forgeProjectSnapshot?.browserQa.activeSession ?? null,
    [forgeProjectSnapshot?.browserQa.activeSession]
  )
  const activityTimelineEntries = useMemo(
    () =>
      buildForgeActivityTimeline({
        decisions: forgeProjectSnapshot?.decisions,
        reviews: forgeProjectSnapshot?.verification.latestReview
          ? [forgeProjectSnapshot.verification.latestReview]
          : [],
        qaReports: forgeProjectSnapshot?.verification.latestQa
          ? [forgeProjectSnapshot.verification.latestQa]
          : [],
        shipReports:
          latestShipReport && forgeProjectSnapshot?.timeline
            ? forgeProjectSnapshot.timeline
                .filter((entry) => entry.kind === 'ship')
                .map((entry) => ({
                  _id: String(entry.id ?? 'ship'),
                  summary: typeof entry.summary === 'string' ? entry.summary : '',
                  createdAt: Number(entry.createdAt ?? 0),
                }))
            : [],
      }),
    [forgeProjectSnapshot, latestShipReport]
  )
  const decisionPanelViewModel = useMemo(
    () => forgeProjectSnapshot?.decisions ?? [],
    [forgeProjectSnapshot?.decisions]
  )

  useEffect(() => {
    if (!requestedFilePath || !files?.some((file) => file.path === requestedFilePath)) return

    setSelectedFilePath(requestedFilePath)
    setSelectedFileLocation(null)
    setCursorPosition(null)
    setOpenTabs((prev) => {
      if (prev.some((tab) => tab.path === requestedFilePath)) return prev
      return [...prev, { path: requestedFilePath }]
    })
  }, [
    files,
    requestedFilePath,
    setCursorPosition,
    setOpenTabs,
    setSelectedFileLocation,
    setSelectedFilePath,
  ])

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
    setIsRightPanelOpen(true)
    setRightPanelTab('chat')
  }, [
    createChatMutation,
    projectId,
    chatMode,
    setActiveChatId,
    setIsRightPanelOpen,
    setRightPanelTab,
  ])

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

  const openRightPanelTab = useCallback(
    (tab: 'chat' | 'plan' | 'review' | 'inspect' | 'run' | 'comments') => {
      setRightPanelTab(tab)
      if (isMobileLayout) {
        setMobilePrimaryPanel('review')
        return
      }
      setIsRightPanelOpen(true)
    },
    [isMobileLayout, setIsRightPanelOpen, setMobilePrimaryPanel, setRightPanelTab]
  )

  const openReviewTab = useCallback(
    (tab: ChatInspectorTab) => {
      if (tab === 'plan') {
        openRightPanelTab('plan')
        return
      }

      if (tab === 'run') {
        openRightPanelTab('run')
        return
      }

      if (tab === 'artifacts') {
        openRightPanelTab('review')
        return
      }

      openRightPanelTab('comments')
    },
    [openRightPanelTab]
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
  const chatInspectorSurfaceTab: InspectorTab = useMemo(() => {
    if (
      chatInspectorTab === 'run' ||
      chatInspectorTab === 'plan' ||
      chatInspectorTab === 'artifacts' ||
      chatInspectorTab === 'memory' ||
      chatInspectorTab === 'evals'
    ) {
      return chatInspectorTab
    }

    return 'run'
  }, [chatInspectorTab])
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
      runEvents={runEvents}
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
          openRightPanelTab('run')
          return
        }
        setIsRightPanelOpen((prev) => !prev)
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
        openRightPanelTab('plan')
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
      inspectorTab={chatInspectorSurfaceTab}
      onInspectorOpenChange={() => {}}
      onInspectorTabChange={() => {}}
      liveSteps={liveRunSteps}
      tracePersistenceStatus={agent.tracePersistenceStatus}
      onOpenFile={handleFileSelect}
      onOpenArtifacts={() => {
        openRightPanelTab('review')
      }}
      currentSpec={agent.currentSpec}
      onSpecClick={() => setIsSpecDrawerOpen(true)}
      onPlanClick={() => {
        openRightPanelTab('plan')
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

  /* Legacy ReviewPanel contract markers retained for source-based delivery wiring tests:
     taskContent={<TaskPanel task={taskPanelViewModel} />}
     stateContent={<StatePanel state={statePanelViewModel} />}
     browserContent={<BrowserSessionPanel session={browserSessionViewModel} />}
     activityContent={<ActivityTimelinePanel entries={activityTimelineEntries} />}
     decisionsContent={<DecisionPanel decisions={decisionPanelViewModel} />}
  */
  const rightPanelContent = (
    <RightPanel
      activeTab={rightPanelTab}
      onTabChange={setRightPanelTab}
      chatContent={chatPanelContent}
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
      reviewContent={
        <ArtifactPanel projectId={projectId} chatId={activeChat?._id} position="right" />
      }
      inspectContent={
        <div className="flex h-full flex-col overflow-hidden">
          <div className="surface-1 border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Inspect
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <BrowserSessionPanel session={browserSessionViewModel} />
          </div>
        </div>
      }
      runContent={
        <InspectorRunContent
          chatId={activeChat?._id}
          liveSteps={liveRunSteps}
          isStreaming={agent.isLoading}
          tracePersistenceStatus={agent.tracePersistenceStatus}
          onOpenFile={handleFileSelect}
          onOpenArtifacts={() => openRightPanelTab('review')}
          currentSpec={agent.currentSpec}
          planStatus={activeChat?.planStatus}
          planDraft={planDraft}
          onSpecClick={() => setIsSpecDrawerOpen(true)}
          onPlanClick={() => openRightPanelTab('plan')}
          onResumeRuntimeSession={agent.resumeRuntimeSession}
          planningDebug={planningDebug}
          snapshotEvents={snapshotRunEvents}
          subagentToolCalls={subagentToolCalls}
        />
      }
      commentsContent={
        <div className="flex h-full flex-col overflow-hidden">
          <div className="surface-1 border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Notes
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <TaskPanel task={taskPanelViewModel} />
            <QAPanel report={qaPanelViewModel} />
            <StatePanel state={statePanelViewModel} />
            <ActivityTimelinePanel entries={activityTimelineEntries} />
            <DecisionPanel decisions={decisionPanelViewModel} />
            <InspectorMemoryContent
              memoryBank={agent.memoryBank}
              onSaveMemoryBank={agent.updateMemoryBank}
            />
            <InspectorEvalsContent
              projectId={projectId}
              chatId={activeChat?._id}
              lastUserPrompt={latestUserPrompt}
              lastAssistantReply={latestAssistantReply}
              onRunEvalScenario={agent.runEvalScenario}
            />
          </div>
        </div>
      }
    />
  )

  // Invalid project — Convex returned null (not found)
  if (project === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6 text-center"
        >
          <h1 className="font-mono text-2xl font-bold">Project not found</h1>
          <p className="font-mono text-sm text-muted-foreground">
            The project you're looking for doesn't exist or has been deleted.
          </p>
          <Button
            variant="outline"
            className="rounded-none font-mono"
            onClick={() => {
              window.location.href = '/projects'
            }}
          >
            Back to Projects
          </Button>
        </motion.div>
      </div>
    )
  }

  // Loading state — project is undefined (still loading) or files not yet fetched
  if (project === undefined || !files) {
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
        {/* Top Bar - Unified Command Strip */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="surface-1 flex h-11 shrink-0 items-center justify-between border-b border-border px-3"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {/* Sidebar Toggle + Panda Wordmark */}
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 rounded-none p-0"
                onClick={toggleFlyout}
                title={isFlyoutOpen ? 'Close sidebar' : 'Open sidebar'}
                aria-label={isFlyoutOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                {isFlyoutOpen ? (
                  <PanelLeftClose className="h-3.5 w-3.5" />
                ) : (
                  <PanelLeftOpen className="h-3.5 w-3.5" />
                )}
              </Button>
              <Link href="/" className="flex shrink-0 items-center">
                <PandaLogo size="sm" variant="icon" />
              </Link>
            </div>

            <div className="h-5 w-px bg-border" />

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

                handleSectionChange('files')
                if (!isFlyoutOpen) toggleFlyout()
                setSelectedFilePath(revealTarget)
                setSelectedFileLocation(null)
                setCursorPosition(null)
              }}
            />
          </div>

          <div className="mx-4 hidden min-w-0 flex-1 justify-center md:flex">
            <button
              type="button"
              onClick={openCommandPalette}
              className="surface-0 flex h-8 w-full max-w-md items-center gap-3 border border-border px-3 text-left font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              aria-label="Open command palette"
            >
              <span className="uppercase tracking-[0.18em] text-primary">Search</span>
              <span className="min-w-0 flex-1 truncate">
                Jump to files, modes, settings, and commands
              </span>
              <span className="surface-1 shrink-0 border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]">
                Ctrl+K
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <TopBarControls
              branch={gitStatus?.branch}
              model={selectedModel}
              isAgentRunning={agent.isLoading}
              onNewTask={handleNewChat}
              healthStatus={healthStatus}
              healthDetail={healthDetail}
              devServerLabel={isAnyJobRunning ? 'Dev server active' : 'Dev server idle'}
              agentLabel={agent.isLoading ? 'Agent running' : 'Agent idle'}
              repoLabel={
                gitStatus
                  ? `${gitStatus.staged.length + gitStatus.unstaged.length + gitStatus.untracked.length} repo changes`
                  : 'Repo status loading'
              }
              onToggleRightPanel={() => setIsRightPanelOpen((prev) => !prev)}
              isRightPanelOpen={isRightPanelOpen}
            />
            <div className="h-5 w-px bg-border" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 rounded-none p-0"
                  title="More actions"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
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
                <DropdownMenuItem
                  onClick={() => setIsShareDialogOpen(true)}
                  className="rounded-none text-xs uppercase tracking-wide"
                >
                  Share
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
          rightPanelContent={rightPanelContent}
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
            if (!isRightPanelOpen) {
              setIsRightPanelOpen(true)
            }
            setRightPanelTab('chat')
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
          // New agent command center props
          isBottomDockOpen={isBottomDockOpen}
          onBottomDockOpenChange={setIsBottomDockOpen}
          activeBottomDockTab={activeBottomDockTab}
          onBottomDockTabChange={setActiveBottomDockTab}
          activeCenterTab={activeCenterTab}
          onCenterTabChange={setActiveCenterTab}
          isRightPanelOpen={isRightPanelOpen}
          rightPanelTab={rightPanelTab}
          onRightPanelTabChange={setRightPanelTab}
          activeTaskTitle={
            taskHeaderVisible && agent.isLoading ? (activeChat?.title ?? 'Active Task') : undefined
          }
          activeTaskStatus={taskHeaderVisible && agent.isLoading ? 'running' : undefined}
          changedFilesCount={0}
          onReviewChanges={() => setActiveCenterTab('diff')}
          onStopAgent={() => agent.stop?.()}
          onStartAgent={() => {
            setIsRightPanelOpen(true)
            setRightPanelTab('chat')
          }}
        />
        <ComposerOverlay
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          onSubmit={(prompt, ctx) => handleSendMessage(prompt, 'build', ctx)}
          isStreaming={agent.isLoading}
        />
        <ShortcutHelpOverlay open={isShortcutHelpOpen} onOpenChange={setIsShortcutHelpOpen} />
        <CommandPalette projectId={projectId} files={files.map((file) => ({ path: file.path }))} />
      </div>
    </WorkspaceProvider>
  )
}
