/**
 * useAgent Hook
 *
 * Combines streaming chat with tool execution for AI agent functionality.
 * Manages agent runtime lifecycle, handles tool calls, and integrates
 * artifact queue with chat interface.
 *
 * @file apps/web/hooks/useAgent.ts
 */

'use client'

import { startTransition, useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useMutation, useConvex, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { LLMProvider, ProviderType } from '../lib/llm/types'
import {
  computeContextMetrics,
  estimateCompletionTokens,
  estimatePromptTokens,
} from '../lib/llm/token-usage'
import {
  createAgentRuntime,
  createToolContext,
  type AgentRuntimeLike,
  type ConvexClient as AgentConvexClient,
} from '../lib/agent'
import type { FormalSpecification } from '../lib/agent/spec/types'
import { getUserFacingAgentError } from '../lib/chat/error-messages'
import { buildHarnessSessionPermissions, type AgentPolicy } from '../lib/agent/automationPolicy'
import { normalizeChatMode, type ChatMode } from '../lib/agent/prompt-library'
import { parsePlanSteps } from '../lib/agent/plan-progress'
import { registerDefaultPlugins } from '../lib/agent/harness/plugins'
import { appLog } from '@/lib/logger'
import { toast } from 'sonner'
import type { GeneratedPlanArtifact } from '../lib/planning/types'
import { spawnVariants } from '../lib/agent/parallelVariants'
import { buildEditorContextBlock } from '../lib/agent/buildEditorContextBlock'

import {
  buildAgentPromptContext,
  buildAgentRuntimeConfig,
  createAgentCheckpointStore,
} from '../lib/agent/session-controller'
import { buildPromptMessagesWithModeSummary } from '../lib/agent/context/session-summary'
import { reduceTerminalAgentEvent } from './useAgent-terminal-events'
import { applyNonTerminalAgentEvent, type EventApplierMutableState } from './useAgent-event-applier'
import { createRunLifecycle } from './useAgent-run-lifecycle'
import {
  buildAssistantAnnotations,
  buildTerminalErrorProgressStep,
  normalizeExactRunUsage,
  type ProgressStep,
} from './useAgent-event-utils'
import { useRunEventBuffer, type TracePersistenceStatus } from './useRunEventBuffer'
import { useProviderSettings } from './useProviderSettings'
import { useTokenUsageMetrics, type UsageTotals, type UsageMetrics } from './useTokenUsageMetrics'
import { useMemoryBank } from './useMemoryBank'
import { useProjectContext } from './useProjectContext'
import { useMessageHistory } from './useMessageHistory'
import { useSpecManagement } from './useSpecManagement'
import { useEditorContextStore } from '@/stores/editorContextStore'
import type {
  Message,
  MessageAnnotationInfo,
  PersistedRunEventInfo,
  TokenSource,
  TokenUsageInfo,
  ToolCallInfo,
} from '@/components/chat/types'

/**
 * Agent status type
 */
type AgentStatus = 'idle' | 'thinking' | 'streaming' | 'executing_tools' | 'complete' | 'error'

type RunEventInput = PersistedRunEventInfo

type UploadedAttachment = {
  storageId: Id<'_storage'>
  kind: 'file' | 'image'
  filename: string
  contentType?: string
  size?: number
  contextFilePath?: string
  url?: string
}

type SendMessageOptions = {
  approvedPlanExecution?: boolean
  approvedPlanExecutionContext?: {
    sessionId: string
    plan: GeneratedPlanArtifact
  }
  includeEditorContext?: boolean
  variantCount?: number
  attachments?: UploadedAttachment[]
  attachmentsOnly?: boolean
}

function normalizeUserContent(rawContent: string, options?: SendMessageOptions): string {
  const trimmed = rawContent.trim()
  if (trimmed) return trimmed
  if (options?.attachmentsOnly && options.attachments && options.attachments.length > 0) {
    return '[User attached files for review.]'
  }
  return ''
}

export function buildPublicSendMessageOptions(options?: SendMessageOptions): {
  clearInput: true
  approvedPlanExecution?: boolean
  approvedPlanExecutionContext?: {
    sessionId: string
    plan: GeneratedPlanArtifact
  }
  includeEditorContext?: boolean
  variantCount?: number
  attachments?: UploadedAttachment[]
  attachmentsOnly?: boolean
} {
  return {
    clearInput: true,
    approvedPlanExecution: options?.approvedPlanExecution,
    approvedPlanExecutionContext: options?.approvedPlanExecutionContext,
    includeEditorContext: options?.includeEditorContext,
    variantCount: options?.variantCount,
    attachments: options?.attachments,
    attachmentsOnly: options?.attachmentsOnly,
  }
}

export function prependEditorContextToContent(content: string, includeEditorContext = true): string {
  if (!includeEditorContext) return content

  const { selectedFilePath, selection, openTabs } = useEditorContextStore.getState()
  const block = buildEditorContextBlock({
    activeFile: selectedFilePath,
    selection,
    openTabs,
  })

  return block ? `${block}\n\n${content}` : content
}

function logUseAgentError(message: string, error: unknown): void {
  appLog.error(`[useAgent] ${message}`, error)
}

/**
 * Options for useAgent hook
 */
interface UseAgentOptions {
  chatId: Id<'chats'>
  projectId: Id<'projects'>
  projectName?: string
  projectDescription?: string
  mode: ChatMode
  provider: LLMProvider
  model?: string
  architectBrainstormEnabled?: boolean
  planDraft?: string
  automationPolicy?: AgentPolicy
  specApprovalMode?: 'interactive' | 'auto_approve'
  onRunCreated?: (args: {
    runId: Id<'agentRuns'>
    approvedPlanExecution: boolean
  }) => void | Promise<void>
  onRunCompleted?: (args: {
    runId: Id<'agentRuns'>
    outcome: 'completed' | 'failed' | 'stopped'
    completedPlanStepIndexes: number[]
    planTotalSteps: number
  }) => void | Promise<void>
}

/**
 * Return type for useAgent hook
 */
interface UseAgentReturn {
  // Messages
  messages: Array<{
    id: string
    role: 'user' | 'assistant' | 'tool'
    content: string
    reasoningContent?: string
    mode: ChatMode
    createdAt: number
    toolCalls?: ToolCallInfo[]
    annotations?: MessageAnnotationInfo
    attachments?: Message['attachments']
  }>

  // Input
  input: string
  setInput: (input: string) => void

  // Status
  status: AgentStatus
  isLoading: boolean
  currentIteration: number

  // Tool calls
  toolCalls: ToolCallInfo[]
  progressSteps: ProgressStep[]
  usageMetrics: UsageMetrics
  tracePersistenceStatus: TracePersistenceStatus
  currentSpec: FormalSpecification | null
  pendingSpec: FormalSpecification | null

  // Artifacts
  pendingArtifacts: Array<{ _id: string }>

  // Memory bank
  memoryBank: string | null | undefined
  updateMemoryBank: (content: string) => Promise<void>

  // Project overview (computed on-demand, not stored as file)
  projectOverview: string | null | undefined

  // Actions
  sendMessage: (
    content: string,
    contextFiles?: string[],
    options?: SendMessageOptions
  ) => Promise<void>
  variantResults: Array<{ content: string; toolCalls: number; elapsedMs: number }>
  runEvalScenario: (scenario: {
    input?: unknown
    prompt?: string
    expected?: unknown
    mode?: string
    evalMode?: 'read_only' | 'full'
  }) => Promise<{
    output: string
    error?: string
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  }>
  handleSubmit: (e?: React.FormEvent) => Promise<void>
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  stop: () => void
  clear: () => void
  approvePendingSpec: (spec?: FormalSpecification) => void
  updatePendingSpecDraft: (spec: FormalSpecification) => void
  cancelPendingSpec: () => void
  resumeRuntimeSession: (sessionID: string) => Promise<void>

  // Error
  error: string | null
}

/**
 * Hook for AI agent with streaming and tool execution
 *
 * Features:
 * - Streaming chat with real-time updates
 * - Tool execution (read_files, write_files, run_command)
 * - Artifact queue integration for user approval
 * - Job creation for command execution
 * - Tool call deduplication and loop detection
 */
export function useAgent(options: UseAgentOptions): UseAgentReturn {
  const {
    chatId,
    projectId,
    projectName,
    projectDescription,
    mode,
    provider,
    model = 'gpt-4o',
    architectBrainstormEnabled = false,
    planDraft,
    automationPolicy,
    specApprovalMode,
    onRunCreated,
    onRunCompleted,
  } = options

  const convex = useConvex()
  const convexClient = convex as unknown as AgentConvexClient

  // Convex queries & mutations
  const currentUser = useQuery(api.users.getCurrent)
  const settings = useQuery(api.settings.get)
  const activePlanningSession = useQuery(
    api.planningSessions.getActiveByChat,
    chatId ? { chatId } : 'skip'
  )
  const persistedModeUsage = useQuery(
    api.agentRuns.usageByChatMode,
    chatId ? { chatId, mode } : 'skip'
  )
  const addMessage = useMutation(api.messages.add)
  const createChatAttachments = useMutation(api.chatAttachments.createMany)
  const attachVerification = useMutation(api.planningSessions.attachVerification)
  const createRun = useMutation(api.agentRuns.create)
  const appendRunEvents = useMutation(api.agentRuns.appendEvents)
  const completeRun = useMutation(api.agentRuns.complete)
  const failRun = useMutation(api.agentRuns.fail)
  const stopRun = useMutation(api.agentRuns.stop)

  // Memory bank hook
  const { memoryBankContent, updateMemoryBank } = useMemoryBank(projectId)

  // Session summaries for context handoffs
  const saveSessionSummaryMutation = useMutation(api.sessionSummaries.save)

  // Project context hook
  const { projectFiles, projectOverviewContent } = useProjectContext(
    projectId,
    projectName,
    projectDescription
  )

  // Artifact store
  const pendingArtifactRecords = useQuery(api.artifacts.list, chatId ? { chatId } : 'skip')
  const pendingArtifacts = useMemo(
    () =>
      (pendingArtifactRecords || [])
        .filter((a) => a.status === 'pending')
        .map((a) => ({ _id: a._id as string })),
    [pendingArtifactRecords]
  )

  // Local state (non-message related)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [currentIteration, setCurrentIteration] = useState(0)
  const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([])
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  const planSteps = useMemo(() => parsePlanSteps(planDraft), [planDraft])
  const completedPlanStepIndexesRef = useRef<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [currentRunUsage, setCurrentRunUsage] = useState<UsageTotals & { source: TokenSource }>()
  const [variantResults, setVariantResults] = useState<
    Array<{ content: string; toolCalls: number; elapsedMs: number }>
  >([])

  // Provider settings hook
  const { contextWindowResolution, getReasoningRuntimeSettings } = useProviderSettings(
    provider,
    model,
    settings as Record<string, unknown> | undefined
  )

  // Refs for controlling the agent
  const abortControllerRef = useRef<AbortController | null>(null)
  const isRunningRef = useRef(false)
  const toolContextRef = useRef<ReturnType<typeof createToolContext> | null>(null)
  const rafFlushRef = useRef<number | null>(null)
  const runtimeRef = useRef<AgentRuntimeLike | null>(null)

  // Spec management hook
  const {
    currentSpec,
    pendingSpec,
    setCurrentSpec,
    setPendingSpec,
    approvePendingSpec,
    updatePendingSpecDraft,
    cancelPendingSpec,
    createSpecMutation,
    updateSpecMutation,
    specPersistenceRef,
  } = useSpecManagement(projectId, chatId, runtimeRef, setStatus)

  const visiblePendingSpec = activePlanningSession?.generatedPlan ? null : pendingSpec

  // Message history hook
  const { messages, setMessages } = useMessageHistory(
    chatId,
    mode,
    getReasoningRuntimeSettings,
    isRunningRef
  )

  // Create artifact queue helpers
  const artifactQueue = useRef({
    addFileArtifact: (path: string, content: string, originalContent?: string | null) => {
      // Legacy fallback only. Canonical artifact persistence happens via Convex in tool handlers.
      void path
      void content
      void originalContent
    },

    addCommandArtifact: (command: string, cwd?: string) => {
      // Legacy fallback only. Canonical artifact persistence happens via Convex in tool handlers.
      void command
      void cwd
    },
  })

  // Get user ID from auth
  const userId = currentUser?._id ?? null

  // Initialize tool context (will be populated when Convex client is available)
  useEffect(() => {
    if (!userId) return

    registerDefaultPlugins()

    toolContextRef.current = createToolContext(
      projectId,
      chatId,
      userId,
      convexClient,
      artifactQueue.current,
      {
        files: { batchGet: api.files.batchGet, list: api.files.list },
        jobs: { create: api.jobs.create, updateStatus: api.jobs.updateStatus },
        artifacts: { create: api.artifacts.create },
        memoryBank: { update: api.memoryBank.update },
      }
    )
  }, [projectId, chatId, convexClient, userId])

  const usageMetrics = useTokenUsageMetrics({
    mode,
    persistedModeUsage,
    currentRunUsage,
    contextWindowResolution,
  })

  const {
    tracePersistenceStatus,
    runIdRef,
    beginRun,
    clearRun,
    appendRunEvent,
    flushRunEventBuffer,
    cleanup: runEventBufferCleanup,
  } = useRunEventBuffer<RunEventInput>({
    appendRunEvents,
    onError: logUseAgentError,
  })

  // Stop the agent
  const stop = useCallback(() => {
    if (pendingSpec) {
      runtimeRef.current?.resolveSpecApproval?.('cancel')
      setPendingSpec(null)
      setCurrentSpec(null)
    }
    const runId = runIdRef.current
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (runtimeRef.current?.abort) {
      runtimeRef.current.abort()
    }
    if (rafFlushRef.current !== null) {
      cancelAnimationFrame(rafFlushRef.current)
      rafFlushRef.current = null
    }
    if (runId) {
      // Keep runId/sequence until sendMessage finalizes the stopped run so
      // trailing abort-unwind events can still be buffered and persisted.
      void flushRunEventBuffer({ force: true, reason: 'stop' })
    }
    setStatus('idle')
  }, [flushRunEventBuffer, pendingSpec, runIdRef, setCurrentSpec, setPendingSpec])

  // Clear messages
  const clear = useCallback(async () => {
    // Save session summary before clearing
    if (projectId && chatId && messages.length > 0) {
      try {
        const { generateStructuredSummary, formatSummaryForHandoff } =
          await import('../lib/agent/context/session-summary')
        const chatMessages = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          toolCalls: msg.toolCalls,
        }))
        const summary = generateStructuredSummary({ messages: chatMessages })
        const formattedSummary = formatSummaryForHandoff(summary)

        await saveSessionSummaryMutation({
          projectId: projectId as Id<'projects'>,
          chatId: chatId as Id<'chats'>,
          summary: formattedSummary,
          structured: summary as unknown as Record<string, unknown>,
          tokenCount: formattedSummary.length / 4, // Rough token estimate
        })
      } catch (err) {
        appLog.warn('[useAgent] Failed to save session summary:', err)
      }
    }

    setMessages([])
    setToolCalls([])
    setProgressSteps([])
    completedPlanStepIndexesRef.current = []
    setError(null)
    setCurrentIteration(0)
    setCurrentRunUsage(undefined)
    setCurrentSpec(null)
    setPendingSpec(null)
  }, [
    projectId,
    chatId,
    messages,
    saveSessionSummaryMutation,
    setCurrentSpec,
    setMessages,
    setPendingSpec,
  ])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }, [])

  // Main submit handler
  const sendMessageInternal = useCallback(
    async (
      rawContent: string,
      contextFiles?: string[],
      options?: {
        clearInput?: boolean
        harnessSessionID?: string
        approvedPlanExecution?: boolean
        approvedPlanExecutionContext?: {
          sessionId: string
          plan: GeneratedPlanArtifact
        }
        includeEditorContext?: boolean
        attachments?: UploadedAttachment[]
        attachmentsOnly?: boolean
      }
    ) => {
      const normalizedUserContent = normalizeUserContent(rawContent, options)
      const userContent = prependEditorContextToContent(
        normalizedUserContent,
        options?.includeEditorContext ?? true
      )
      if (!userContent || isRunningRef.current) return
      if (options?.clearInput !== false) {
        setInput('')
      }

      // Capture a snapshot of prior conversation for prompt building.
      // Note: we exclude tool messages here because our UI message shape
      // doesn't retain tool_call_id, which some providers require.
      // IMPORTANT: Claude Code-style mode separation.
      // When in Plan mode, don't include Build messages in context (and vice versa),
      // otherwise the model continues implementation even after switching modes.
      const previousMessagesSnapshot = buildPromptMessagesWithModeSummary({
        currentMode: mode,
        messages,
      })

      const estimatedPromptTokens = estimatePromptTokens({
        providerType: (provider?.config?.provider || 'openai') as ProviderType,
        model,
        messages: [...previousMessagesSnapshot, { role: 'user', content: userContent }],
      })
      let runUsage: UsageTotals & { source: TokenSource } = {
        promptTokens: estimatedPromptTokens,
        completionTokens: 0,
        totalTokens: estimatedPromptTokens,
        source: 'estimated',
      }
      setCurrentRunUsage(runUsage)

      // Lock as running before any awaited work to prevent duplicate submits.
      isRunningRef.current = true
      abortControllerRef.current = new AbortController()
      setStatus('thinking')
      setError(null)
      setProgressSteps([])
      completedPlanStepIndexesRef.current = []

      // Add user message to local state
      const userMessageId = `msg-${Date.now()}-user`
      setMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          _id: userMessageId,
          role: 'user',
          content: userContent,
          mode,
          createdAt: Date.now(),
          annotations: {
            mode,
            attachmentsOnly: options?.attachmentsOnly,
          },
          attachments: options?.attachments?.map((attachment) => ({
            kind: attachment.kind,
            filename: attachment.filename,
            contentType: attachment.contentType,
            size: attachment.size,
            url: attachment.url ?? undefined,
            contextFilePath: attachment.contextFilePath,
          })),
        },
      ])

      // Persist user message to Convex
      try {
        const persistedMessageId = await addMessage({
          chatId,
          role: 'user',
          content: userContent,
          annotations: [
            {
              mode,
              attachmentsOnly: options?.attachmentsOnly,
              model,
              provider: provider?.config?.provider,
              attachments: options?.attachments?.map((attachment) => ({
                id: String(attachment.storageId),
                kind: attachment.kind,
                filename: attachment.filename,
                contentType: attachment.contentType,
                size: attachment.size,
                url: attachment.url ?? undefined,
                contextFilePath: attachment.contextFilePath,
              })),
            },
          ],
        })

        if (options?.attachments?.length) {
          await createChatAttachments({
            chatId,
            messageId: persistedMessageId,
            attachments: options.attachments.map((attachment) => ({
              storageId: attachment.storageId,
              kind: attachment.kind,
              filename: attachment.filename,
              contentType: attachment.contentType,
              size: attachment.size,
              contextFilePath: attachment.contextFilePath,
            })),
          })
        }
      } catch (err) {
        logUseAgentError('Failed to persist user message', err)
      }

      try {
        // Create prompt context
        if (!userId) {
          throw new Error('User not authenticated')
        }
        setCurrentSpec(null)

        const runId = await createRun({
          projectId,
          chatId,
          userId,
          mode,
          provider: provider?.config?.provider,
          model,
          userMessage: userContent,
        })
        beginRun(runId)
        if (onRunCreated) {
          await onRunCreated({
            runId,
            approvedPlanExecution: Boolean(options?.approvedPlanExecution),
          })
        }
        let terminalAgentStatus: 'complete' | 'error' | null = null
        const runLifecycle = createRunLifecycle({
          runIdRef,
          clearRun,
          flushRunEventBuffer,
          completeRun,
          failRun,
          stopRun,
          onRunCompleted,
          getCompletedPlanStepIndexes: () => [...completedPlanStepIndexesRef.current],
          getPlanTotalSteps: () => planSteps.length,
        })

        await appendRunEvent({
          type: 'run_started',
          content: userContent,
          status: 'running',
        })

        const promptContext = buildAgentPromptContext({
          projectId,
          chatId,
          userId,
          projectName,
          projectDescription,
          mode,
          provider: provider?.config?.provider || 'openai',
          previousMessages: previousMessagesSnapshot.map((message) => ({
            role: message.role === 'assistant' ? 'assistant' : 'user',
            content: message.content,
          })),
          projectOverviewContent,
          // Note: projectFiles now only contains metadata (no content)
          // Content is loaded on-demand via batchGet when needed
          projectFiles: projectFiles?.map((file) => ({
            path: file.path,
            content: '', // Content loaded on-demand
            updatedAt: file.updatedAt,
          })),
          memoryBankContent,
          userContent,
          contextFiles,
          architectBrainstormEnabled,
          planDraft,
          approvedPlanExecutionContext: options?.approvedPlanExecutionContext,
          activeSpec: currentSpec ?? undefined,
        })

        // Create runtime config with deduplication
        // Note: maxToolCallsPerIteration is set high to allow batch file generation
        // The AI should be able to generate as many files as needed in one iteration
        const runtimeConfig = buildAgentRuntimeConfig({
          runId,
          mode,
          harnessSessionID: options?.harnessSessionID,
          specApprovalMode,
        })

        // Get tool context
        if (!userId) {
          throw new Error('User not authenticated')
        }

        const toolContext =
          toolContextRef.current ??
          createToolContext(projectId, chatId, userId, convexClient, artifactQueue.current, {
            files: { batchGet: api.files.batchGet, list: api.files.list },
            jobs: { create: api.jobs.create, updateStatus: api.jobs.updateStatus },
            artifacts: { create: api.artifacts.create },
            memoryBank: { update: api.memoryBank.update },
          })

        // Create agent runtime
        const runtimeSettings = getReasoningRuntimeSettings()
        const checkpointClient = convex as unknown as {
          query: (func: unknown, args: Record<string, unknown>) => Promise<unknown>
          mutation: (func: unknown, args: Record<string, unknown>) => Promise<unknown>
        }
        const checkpointStore = createAgentCheckpointStore({
          client: checkpointClient,
          runId,
          chatId,
          projectId,
          harnessSessionID: options?.harnessSessionID,
        })
        const runtime = createAgentRuntime(
          {
            provider,
            model,
            maxIterations: runtimeConfig.maxIterations,
            harnessCheckpointStore: checkpointStore,
            // Enable risk interrupts - PermissionDialog handles the UI
            harnessEnableRiskInterrupts: true,
            harnessSessionPermissions: automationPolicy
              ? buildHarnessSessionPermissions(automationPolicy)
              : undefined,
            ...(runtimeSettings.reasoning ? { reasoning: runtimeSettings.reasoning } : {}),
          },
          toolContext
        )
        runtimeRef.current = runtime

        // Run the agent
        let assistantContent = ''
        let assistantReasoning = ''
        let assistantToolCalls: ToolCallInfo[] = []
        const assistantMessageId = `msg-${Date.now()}-assistant`
        let pendingPaint = false
        let replaceOnNextText = false
        let rewriteNoticeShown = false
        const buildUsageAnnotations = () => {
          const context = computeContextMetrics({
            usedTokens: usageMetrics.session.totalTokens + runUsage.totalTokens,
            contextWindow: contextWindowResolution.contextWindow,
          })
          return {
            mode,
            model,
            provider: provider?.config?.provider,
            tokenCount: runUsage.totalTokens,
            promptTokens: runUsage.promptTokens,
            completionTokens: runUsage.completionTokens,
            totalTokens: runUsage.totalTokens,
            tokenSource: runUsage.source,
            contextWindow: contextWindowResolution.contextWindow,
            contextUsedTokens: context.usedTokens,
            contextRemainingTokens: context.remainingTokens,
            contextUsagePct: context.usagePct,
            contextSource: contextWindowResolution.source,
          }
        }

        const schedulePaint = () => {
          if (pendingPaint) return
          pendingPaint = true
          const flush = () => {
            pendingPaint = false
            rafFlushRef.current = null
            startTransition(() => {
              setMessages((prev) => {
                const existingIndex = prev.findIndex((m) => m.id === assistantMessageId)
                if (existingIndex >= 0) {
                  const updated = [...prev]
                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    content: assistantContent,
                    reasoningContent: runtimeSettings.showReasoningPanel ? assistantReasoning : '',
                    mode,
                    createdAt: updated[existingIndex]!.createdAt,
                    toolCalls: assistantToolCalls,
                    annotations: buildUsageAnnotations(),
                  }
                  return updated
                }
                return [
                  ...prev,
                  {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: assistantContent,
                    reasoningContent: runtimeSettings.showReasoningPanel ? assistantReasoning : '',
                    mode,
                    createdAt: Date.now(),
                    toolCalls: assistantToolCalls,
                    annotations: buildUsageAnnotations(),
                  },
                ]
              })
            })
          }
          if (typeof requestAnimationFrame === 'function') {
            rafFlushRef.current = requestAnimationFrame(() => {
              setTimeout(flush, 0)
            })
          } else {
            rafFlushRef.current = setTimeout(flush, 50) as unknown as number
          }
        }

        for await (const event of runtime.run(promptContext, runtimeConfig)) {
          // Check for abort
          if (abortControllerRef.current?.signal.aborted) {
            break
          }

          const eventMutableState: EventApplierMutableState = {
            assistantContent,
            assistantReasoning,
            assistantToolCalls,
            replaceOnNextText,
            rewriteNoticeShown,
            runUsage,
          }

          const handledNonTerminalEvent = applyNonTerminalAgentEvent({
            event,
            mode,
            assistantMessageId,
            projectId,
            chatId,
            runId: runIdRef.current,
            planningSessionId: activePlanningSession?.sessionId ?? null,
            planSteps,
            completedPlanStepIndexesRef,
            specPersistence: specPersistenceRef.current,
            runtimeSettings,
            mutable: eventMutableState,
            estimateCompletionTokens: (content) =>
              estimateCompletionTokens({
                providerType: (provider?.config?.provider || 'openai') as ProviderType,
                model,
                content,
              }),
            appendRunEvent,
            createSpec: createSpecMutation,
            attachVerification,
            updateSpec: updateSpecMutation,
            setStatus,
            setCurrentIteration,
            setCurrentRunUsage,
            setProgressSteps,
            setPendingSpec,
            setCurrentSpec,
            setToolCalls,
            setMessages,
            schedulePaint,
          })

          if (handledNonTerminalEvent) {
            assistantContent = eventMutableState.assistantContent
            assistantReasoning = eventMutableState.assistantReasoning
            assistantToolCalls = eventMutableState.assistantToolCalls
            replaceOnNextText = eventMutableState.replaceOnNextText
            rewriteNoticeShown = eventMutableState.rewriteNoticeShown
            runUsage = eventMutableState.runUsage
            continue
          }

          switch (event.type) {
            case 'complete':
              {
                const terminalEvent = reduceTerminalAgentEvent(
                  {
                    runFinalized: runLifecycle.isFinalized(),
                    terminalStatus: terminalAgentStatus,
                  },
                  'complete'
                )
                if (!terminalEvent.shouldProcess) {
                  break
                }
                terminalAgentStatus = terminalEvent.terminalStatus
              }
              setPendingSpec(null)
              setStatus('complete')
              isRunningRef.current = false
              specPersistenceRef.current.clear()
              runUsage = normalizeExactRunUsage(event.usage, runUsage)
              setCurrentRunUsage(runUsage)

              // Persist assistant message to Convex
              try {
                const annotations: MessageAnnotationInfo = buildAssistantAnnotations({
                  mode,
                  model,
                  provider: provider?.config?.provider,
                  toolCalls: assistantToolCalls,
                  assistantReasoning,
                  runUsage,
                  usageSessionTotalTokens: usageMetrics.session.totalTokens,
                  contextWindow: contextWindowResolution.contextWindow,
                  contextSource: contextWindowResolution.source,
                })

                await addMessage({
                  chatId,
                  role: 'assistant',
                  content: assistantContent,
                  annotations: [annotations],
                })
                await appendRunEvent(
                  {
                    type: 'assistant_message',
                    content: assistantContent,
                    usage: event.usage as TokenUsageInfo | undefined,
                    status: 'completed',
                  },
                  { forceFlush: true }
                )
                await runLifecycle.finalizeRunCompleted(
                  assistantContent,
                  event.usage as TokenUsageInfo | undefined
                )
              } catch (err) {
                logUseAgentError('Failed to persist assistant message', err)
              }
              break

            case 'error': {
              {
                const terminalEvent = reduceTerminalAgentEvent(
                  {
                    runFinalized: runLifecycle.isFinalized(),
                    terminalStatus: terminalAgentStatus,
                  },
                  'error'
                )
                if (!terminalEvent.shouldProcess) {
                  break
                }
                terminalAgentStatus = terminalEvent.terminalStatus
              }
              if (event.error === 'Specification approval cancelled') {
                setStatus('idle')
                setError(null)
                setPendingSpec(null)
                setCurrentSpec(null)
                isRunningRef.current = false
                await appendRunEvent(
                  {
                    type: 'spec_cancelled',
                    content: 'Specification approval cancelled',
                    status: 'stopped',
                  },
                  { forceFlush: true }
                )
                await runLifecycle.finalizeRunStopped()
                break
              }
              const userFacing = getUserFacingAgentError(event.error)
              setStatus('error')
              setError(userFacing.description)
              const errorStep: ProgressStep = buildTerminalErrorProgressStep({
                title: userFacing.title,
                description: userFacing.description,
              })
              setProgressSteps((prev) => [...prev, errorStep].slice(-30))
              isRunningRef.current = false
              specPersistenceRef.current.clear()
              await appendRunEvent(
                {
                  type: 'error',
                  error: event.error || 'Unknown error',
                  status: 'failed',
                },
                { forceFlush: true }
              )
              await runLifecycle.finalizeRunFailed(event.error || 'Unknown error')
              toast.error(userFacing.title, {
                description: userFacing.description,
              })
              break
            }
          }
        }

        // Reset status if still running (e.g., aborted)
        if (isRunningRef.current) {
          setStatus('idle')
          isRunningRef.current = false
          await runLifecycle.finalizeRunStopped()
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (message === 'Specification approval cancelled') {
          setStatus('idle')
          setError(null)
          setPendingSpec(null)
          setCurrentSpec(null)
          isRunningRef.current = false
          specPersistenceRef.current.clear()
          await appendRunEvent(
            {
              type: 'spec_cancelled',
              content: 'Specification approval cancelled',
              status: 'stopped',
            },
            { forceFlush: true }
          )
          if (runIdRef.current) {
            await flushRunEventBuffer({ force: true, reason: 'spec-cancel' })
            await stopRun({
              runId: runIdRef.current,
            })
            clearRun()
          }
          return
        }
        const userFacing = getUserFacingAgentError(message)
        setStatus('error')
        setError(userFacing.description)
        isRunningRef.current = false
        specPersistenceRef.current.clear()
        await appendRunEvent(
          {
            type: 'error',
            error: message,
            status: 'failed',
          },
          { forceFlush: true }
        )
        if (runIdRef.current) {
          try {
            await flushRunEventBuffer({ force: true, reason: 'fail' })
            await failRun({ runId: runIdRef.current, error: message })
          } catch (runErr) {
            logUseAgentError('Failed to finalize run failure', runErr)
          } finally {
            clearRun()
          }
        }
        toast.error(userFacing.title, {
          description: userFacing.description,
        })
      }
    },
    [
      messages,
      chatId,
      projectId,
      mode,
      provider,
      model,
      architectBrainstormEnabled,
      planDraft,
      addMessage,
      activePlanningSession?.sessionId,
      attachVerification,
      createChatAttachments,
      beginRun,
      clearRun,
      createRun,
      appendRunEvent,
      completeRun,
      convex,
      convexClient,
      failRun,
      flushRunEventBuffer,
      stopRun,
      userId,
      runIdRef,
      getReasoningRuntimeSettings,
      usageMetrics.session.totalTokens,
      contextWindowResolution.contextWindow,
      contextWindowResolution.source,
      memoryBankContent,
      projectName,
      projectDescription,
      projectOverviewContent,
      projectFiles,
      planSteps,
      automationPolicy,
      onRunCreated,
      onRunCompleted,
      createSpecMutation,
      updateSpecMutation,
      setCurrentSpec,
      currentSpec,
      setMessages,
      setPendingSpec,
      specApprovalMode,
      specPersistenceRef,
    ]
  )

  const sendMessageWithVariants = useCallback(
    async (rawContent: string, contextFiles?: string[], options?: SendMessageOptions) => {
      const normalizedUserContent = normalizeUserContent(rawContent, options)
      const userContent = prependEditorContextToContent(
        normalizedUserContent,
        options?.includeEditorContext ?? true
      )
      if (!userContent || isRunningRef.current || !userId) return

      const variantCount = options?.variantCount ?? 2
      const previousMessagesSnapshot = buildPromptMessagesWithModeSummary({
        currentMode: mode,
        messages,
      })
      const promptContext = buildAgentPromptContext({
        projectId,
        chatId,
        userId,
        projectName,
        projectDescription,
        mode,
        provider: provider?.config?.provider || 'openai',
        previousMessages: previousMessagesSnapshot.map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: message.content,
        })),
        projectOverviewContent,
        projectFiles: projectFiles?.map((file) => ({
          path: file.path,
          content: '',
          updatedAt: file.updatedAt,
        })),
        memoryBankContent,
        userContent,
        contextFiles,
        architectBrainstormEnabled,
        planDraft,
        approvedPlanExecutionContext: options?.approvedPlanExecutionContext,
        activeSpec: currentSpec ?? undefined,
      })

      const toolContext =
        toolContextRef.current ??
        createToolContext(projectId, chatId, userId, convexClient, artifactQueue.current, {
          files: { batchGet: api.files.batchGet, list: api.files.list },
          jobs: { create: api.jobs.create, updateStatus: api.jobs.updateStatus },
          artifacts: { create: api.artifacts.create },
          memoryBank: { update: api.memoryBank.update },
        })

      const runtimeSettings = getReasoningRuntimeSettings()
      setInput('')
      setError(null)
      setStatus('thinking')
      setVariantResults([])

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-user`,
          _id: `msg-${Date.now()}-user`,
          role: 'user',
          content: userContent,
          mode,
          createdAt: Date.now(),
          annotations: { mode },
        },
      ])

      const results = await spawnVariants({
        count: variantCount,
        promptContext,
        runtimeConfig: buildAgentRuntimeConfig({
          runId: `variant-${Date.now()}`,
          mode,
          specApprovalMode,
        }),
        makeRuntime: (index) =>
          createAgentRuntime(
            {
              provider,
              model,
              maxIterations: 10,
              temperature: index === 0 ? 0.2 : 0.8,
              harnessEnableRiskInterrupts: true,
              harnessSessionPermissions: automationPolicy
                ? buildHarnessSessionPermissions(automationPolicy)
                : undefined,
              ...(runtimeSettings.reasoning ? { reasoning: runtimeSettings.reasoning } : {}),
            },
            toolContext
          ),
      })

      setVariantResults(results)
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: results
            .map((result, index) => `Variant ${index + 1}:\n${result.content}`)
            .join('\n\n---\n\n'),
          mode,
          createdAt: Date.now(),
          annotations: {
            mode,
            provider: provider?.config?.provider,
            model,
          },
        },
      ])
      setStatus('idle')
    },
    [
      userId,
      mode,
      messages,
      projectId,
      chatId,
      projectName,
      projectDescription,
      provider,
      projectOverviewContent,
      projectFiles,
      memoryBankContent,
      architectBrainstormEnabled,
      planDraft,
      currentSpec,
      convexClient,
      getReasoningRuntimeSettings,
      specApprovalMode,
      model,
      automationPolicy,
      setMessages,
    ]
  )

  const sendMessage = useCallback(
    async (rawContent: string, contextFiles?: string[], options?: SendMessageOptions) => {
      const publicOptions = buildPublicSendMessageOptions(options)
      if (
        process.env.NEXT_PUBLIC_PANDA_VARIANTS === '1' &&
        publicOptions.variantCount &&
        publicOptions.variantCount > 1
      ) {
        await sendMessageWithVariants(rawContent, contextFiles, publicOptions)
        return
      }

      await sendMessageInternal(rawContent, contextFiles, publicOptions)
    },
    [sendMessageInternal, sendMessageWithVariants]
  )

  const resumeRuntimeSession = useCallback(
    async (sessionID: string) => {
      toast.info('Resuming previous run', {
        description: 'Panda is restoring the latest recoverable runtime checkpoint.',
      })
      await sendMessageInternal('Resume previous run', undefined, {
        clearInput: false,
        harnessSessionID: sessionID,
      })
    },
    [sendMessageInternal]
  )

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      await sendMessage(input)
    },
    [input, sendMessage]
  )

  const runEvalScenario = useCallback<UseAgentReturn['runEvalScenario']>(
    async (scenario) => {
      if (!userId) {
        throw new Error('User not authenticated')
      }
      if (!provider) {
        throw new Error('Provider unavailable')
      }

      const toolContext =
        toolContextRef.current ??
        createToolContext(projectId, chatId, userId, convexClient, artifactQueue.current, {
          files: { batchGet: api.files.batchGet, list: api.files.list },
          jobs: { create: api.jobs.create, updateStatus: api.jobs.updateStatus },
          artifacts: { create: api.artifacts.create },
          memoryBank: { update: api.memoryBank.update },
        })

      const runtimeSettings = getReasoningRuntimeSettings()
      const runtime = createAgentRuntime(
        {
          provider,
          model,
          maxIterations: 10,
          harnessEvalMode: scenario.evalMode ?? 'read_only',
          harnessSessionPermissions: automationPolicy
            ? buildHarnessSessionPermissions(automationPolicy)
            : undefined,
          ...(runtimeSettings.reasoning ? { reasoning: runtimeSettings.reasoning } : {}),
        },
        toolContext
      )

      const scenarioMode = normalizeChatMode(
        typeof scenario.mode === 'string' ? scenario.mode : mode,
        mode
      )
      const textInput =
        typeof scenario.prompt === 'string'
          ? scenario.prompt
          : typeof scenario.input === 'string'
            ? scenario.input
            : JSON.stringify(scenario.input ?? '', null, 2)

      const promptContext = buildAgentPromptContext({
        projectId,
        chatId,
        userId,
        projectName,
        projectDescription,
        mode: scenarioMode,
        provider: provider.config?.provider || 'openai',
        previousMessages: [],
        projectOverviewContent,
        // Note: projectFiles now only contains metadata (no content)
        // Content is loaded on-demand via batchGet when needed
        projectFiles: projectFiles?.map((file) => ({
          path: file.path,
          content: '', // Content loaded on-demand
          updatedAt: file.updatedAt,
        })),
        memoryBankContent,
        userContent: textInput,
        architectBrainstormEnabled,
      })

      const result = await runtime.runSync(promptContext)
      return {
        output: result.content,
        error: result.error,
        usage: result.usage,
      }
    },
    [
      userId,
      provider,
      projectId,
      chatId,
      convexClient,
      getReasoningRuntimeSettings,
      model,
      mode,
      memoryBankContent,
      architectBrainstormEnabled,
      projectName,
      projectDescription,
      projectOverviewContent,
      projectFiles,
      automationPolicy,
    ]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
      runEventBufferCleanup()
    }
  }, [stop, runEventBufferCleanup])

  return {
    messages,
    input,
    setInput,
    status,
    isLoading: status === 'thinking' || status === 'streaming' || status === 'executing_tools',
    currentIteration,
    toolCalls,
    progressSteps,
    usageMetrics,
    currentSpec,
    pendingSpec: visiblePendingSpec,
    pendingArtifacts,
    memoryBank: memoryBankContent,
    updateMemoryBank,
    projectOverview: projectOverviewContent,
    sendMessage,
    variantResults,
    runEvalScenario,
    handleSubmit,
    handleInputChange,
    stop,
    clear,
    approvePendingSpec,
    updatePendingSpecDraft,
    cancelPendingSpec,
    resumeRuntimeSession,
    error,
    tracePersistenceStatus,
  }
}

export default useAgent
