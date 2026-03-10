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

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useMutation, useConvex, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { LLMProvider, ModelInfo, ProviderType, ReasoningOptions } from '../lib/llm/types'
import { getDefaultProviderCapabilities } from '../lib/llm/types'
import { resolveContextWindow, type ContextWindowSource } from '../lib/llm/model-metadata'
import {
  computeContextMetrics,
  estimateCompletionTokens,
  estimatePromptTokens,
} from '../lib/llm/token-usage'
import {
  createAgentRuntime,
  createToolContext,
  type AgentEvent,
  type AgentRuntimeLike,
  type RuntimeConfig,
  type ConvexClient as AgentConvexClient,
} from '../lib/agent'
import { ConvexCheckpointStore } from '../lib/agent/harness/convex-checkpoint-store'
import type { FormalSpecification } from '../lib/agent/spec/types'
import { getUserFacingAgentError } from '../lib/chat/error-messages'
import { extractTargetFilePaths } from '../components/chat/live-run-utils'
import { normalizeChatMode, type PromptContext, type ChatMode } from '../lib/agent/prompt-library'
import { plugins, specTrackingPlugin } from '../lib/agent/harness/plugins'
import { appLog } from '@/lib/logger'
import { toast } from 'sonner'
import {
  generateRepoOverview,
  formatOverviewForPrompt,
  type FileInfo,
} from '../lib/agent/context/repo-overview'

/**
 * Agent status type
 */
type AgentStatus = 'idle' | 'thinking' | 'streaming' | 'executing_tools' | 'complete' | 'error'

/**
 * Tool call info for UI display
 */
interface ToolCallInfo {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'error'
  result?: {
    output: string
    error?: string
    durationMs: number
  }
}

interface ProgressStep {
  id: string
  content: string
  status: 'running' | 'completed' | 'error'
  category?: 'analysis' | 'rewrite' | 'tool' | 'complete' | 'other'
  details?: {
    toolName?: string
    toolCallId?: string
    argsSummary?: string
    durationMs?: number
    errorExcerpt?: string
    targetFilePaths?: string[]
    hasArtifactTarget?: boolean
  }
  createdAt: number
}

interface PersistedMessageAnnotation {
  mode?: unknown
  reasoningSummary?: unknown
  toolCalls?: unknown
  model?: unknown
  provider?: unknown
  tokenCount?: unknown
  promptTokens?: unknown
  completionTokens?: unknown
  totalTokens?: unknown
  tokenSource?: unknown
  contextWindow?: unknown
  contextUsedTokens?: unknown
  contextRemainingTokens?: unknown
  contextUsagePct?: unknown
  contextSource?: unknown
  reasoningTokens?: unknown
}

interface ReasoningProviderConfig {
  showReasoningPanel?: boolean
  reasoningEnabled?: boolean
  reasoningBudget?: number
  reasoningMode?: 'auto' | 'low' | 'medium' | 'high'
}

interface RunEventInput {
  type: string
  content?: string
  status?: string
  progressCategory?: 'analysis' | 'rewrite' | 'tool' | 'complete' | 'other'
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
}

type TokenSource = 'exact' | 'estimated'
type TracePersistenceStatus = 'live' | 'degraded'

interface UsageTotals {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

interface UsageMetrics {
  mode: ChatMode
  session: UsageTotals
  currentRun?: UsageTotals & { source: TokenSource }
  contextWindow: number
  usedTokens: number
  remainingTokens: number
  usagePct: number
  contextSource: ContextWindowSource
}

interface BufferedRunEvent {
  runId: Id<'agentRuns'>
  event: RunEventInput & { sequence: number }
}

function summarizeArgs(args: Record<string, unknown> | undefined): string | undefined {
  if (!args) return undefined
  const serialized = JSON.stringify(args)
  if (!serialized) return undefined
  return serialized.length > 140 ? `${serialized.slice(0, 137)}...` : serialized
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function toOptionalFiniteNumber(value: unknown): number | undefined {
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
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
    annotations?: {
      model?: string
      tokenCount?: number
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
      tokenSource?: TokenSource
      mode?: ChatMode
      provider?: string
      reasoningTokens?: number
      contextWindow?: number
      contextUsedTokens?: number
      contextRemainingTokens?: number
      contextUsagePct?: number
      contextSource?: ContextWindowSource
    }
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
  sendMessage: (content: string, contextFiles?: string[]) => Promise<void>
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
  } = options

  const convex = useConvex()
  const convexClient = convex as unknown as AgentConvexClient

  // Convex queries & mutations
  const currentUser = useQuery(api.users.getCurrent)
  const persistedMessages = useQuery(api.messages.list, chatId ? { chatId } : 'skip')
  const settings = useQuery(api.settings.get)
  const persistedModeUsage = useQuery(
    api.agentRuns.usageByChatMode,
    chatId ? { chatId, mode } : 'skip'
  )
  const addMessage = useMutation(api.messages.add)
  const createRun = useMutation(api.agentRuns.create)
  const appendRunEvents = useMutation(api.agentRuns.appendEvents)
  const completeRun = useMutation(api.agentRuns.complete)
  const failRun = useMutation(api.agentRuns.fail)
  const stopRun = useMutation(api.agentRuns.stop)

  // Memory bank
  const memoryBankContent = useQuery(
    api.memoryBank.get,
    projectId ? { projectId: projectId as Id<'projects'> } : 'skip'
  )
  const updateMemoryBankMutation = useMutation(api.memoryBank.update)

  // Session summaries for context handoffs
  const saveSessionSummaryMutation = useMutation(api.sessionSummaries.save)

  // Project files for overview generation
  const projectFiles = useQuery(
    api.files.list,
    projectId ? { projectId: projectId as Id<'projects'> } : 'skip'
  )

  // Project overview - computed on-demand, not stored as file
  const projectOverviewContent = useMemo(() => {
    if (!projectFiles || !projectName || projectFiles.length === 0) {
      return null
    }

    try {
      const fileInfos: FileInfo[] = projectFiles.map((f) => ({
        path: f.path,
        content: f.content,
        updatedAt: f.updatedAt,
      }))

      const overview = generateRepoOverview(fileInfos, projectName, projectDescription)
      return formatOverviewForPrompt(overview)
    } catch (err) {
      appLog.warn('[useAgent] Failed to generate project overview:', err)
      return null
    }
  }, [projectFiles, projectName, projectDescription])

  // Artifact store
  const pendingArtifactRecords = useQuery(api.artifacts.list, chatId ? { chatId } : 'skip')
  const pendingArtifacts = useMemo(
    () =>
      (pendingArtifactRecords || [])
        .filter((a) => a.status === 'pending')
        .map((a) => ({ _id: a._id as string })),
    [pendingArtifactRecords]
  )

  // Local state
  const [messages, setMessages] = useState<UseAgentReturn['messages']>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [currentIteration, setCurrentIteration] = useState(0)
  const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([])
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  const [error, setError] = useState<string | null>(null)
  const [providerModels, setProviderModels] = useState<ModelInfo[]>([])
  const [currentRunUsage, setCurrentRunUsage] = useState<UsageTotals & { source: TokenSource }>()
  const [currentSpec, setCurrentSpec] = useState<FormalSpecification | null>(null)
  const [pendingSpec, setPendingSpec] = useState<FormalSpecification | null>(null)
  const [tracePersistenceStatus, setTracePersistenceStatus] =
    useState<TracePersistenceStatus>('live')

  // Refs for controlling the agent
  const abortControllerRef = useRef<AbortController | null>(null)
  const isRunningRef = useRef(false)
  const toolContextRef = useRef<ReturnType<typeof createToolContext> | null>(null)
  const rafFlushRef = useRef<number | null>(null)
  const runIdRef = useRef<Id<'agentRuns'> | null>(null)
  const runSequenceRef = useRef(0)
  const runEventBufferRef = useRef<BufferedRunEvent[]>([])
  const runEventFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runEventFlushPromiseRef = useRef<Promise<void> | null>(null)
  const runtimeRef = useRef<AgentRuntimeLike | null>(null)
  const runEventFlushAgainRef = useRef(false)
  const runEventFlushAgainForceRef = useRef(false)
  const tracePersistenceStatusRef = useRef<TracePersistenceStatus>('live')

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

    // Ensure specTracking plugin is registered to track drift
    if (!plugins.has('spec-tracking')) {
      plugins.register(specTrackingPlugin)
    }

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

  // Stop the agent
  const getReasoningRuntimeSettings = useCallback(() => {
    const providerType = (provider?.config?.provider || 'openai') as ProviderType
    const capabilities =
      provider?.config?.capabilities ?? getDefaultProviderCapabilities(providerType)

    const providerKey = settings?.defaultProvider || providerType
    const providerConfig = (settings?.providerConfigs?.[providerKey] ??
      {}) as ReasoningProviderConfig

    const showReasoningPanel = providerConfig.showReasoningPanel !== false
    const reasoningEnabled = Boolean(providerConfig.reasoningEnabled)
    const reasoningBudget = Number(providerConfig.reasoningBudget ?? 6000)
    const reasoningMode = String(providerConfig.reasoningMode ?? 'auto')

    let reasoning: ReasoningOptions | undefined
    if (capabilities.supportsReasoning && reasoningEnabled) {
      reasoning = {
        enabled: true,
        ...(Number.isFinite(reasoningBudget) && reasoningBudget > 0
          ? { budgetTokens: reasoningBudget }
          : {}),
      }
      if (reasoningMode === 'low' || reasoningMode === 'medium' || reasoningMode === 'high') {
        reasoning.effort = reasoningMode
      }
    }

    return {
      showReasoningPanel,
      reasoning,
    }
  }, [provider, settings])

  useEffect(() => {
    let cancelled = false

    const loadProviderModels = async () => {
      if (!provider || typeof provider.listModels !== 'function') {
        setProviderModels([])
        return
      }
      try {
        const models = await provider.listModels()
        if (!cancelled) {
          setProviderModels(Array.isArray(models) ? models : [])
        }
      } catch (error) {
        void error
        if (!cancelled) {
          setProviderModels([])
        }
      }
    }

    void loadProviderModels()

    return () => {
      cancelled = true
    }
  }, [provider])

  const providerType = (provider?.config?.provider || 'openai') as ProviderType
  const contextWindowResolution = useMemo(
    () => resolveContextWindow({ providerType, model, providerModels }),
    [providerType, model, providerModels]
  )

  const sessionUsage = useMemo<UsageTotals>(
    () => ({
      promptTokens: toFiniteNumber(persistedModeUsage?.promptTokens),
      completionTokens: toFiniteNumber(persistedModeUsage?.completionTokens),
      totalTokens: toFiniteNumber(persistedModeUsage?.totalTokens),
    }),
    [persistedModeUsage]
  )

  const usageMetrics = useMemo<UsageMetrics>(() => {
    const sessionWithCurrent: UsageTotals = {
      promptTokens: sessionUsage.promptTokens + (currentRunUsage?.promptTokens ?? 0),
      completionTokens: sessionUsage.completionTokens + (currentRunUsage?.completionTokens ?? 0),
      totalTokens: sessionUsage.totalTokens + (currentRunUsage?.totalTokens ?? 0),
    }
    const context = computeContextMetrics({
      usedTokens: sessionWithCurrent.totalTokens,
      contextWindow: contextWindowResolution.contextWindow,
    })

    return {
      mode,
      session: sessionUsage,
      ...(currentRunUsage ? { currentRun: currentRunUsage } : {}),
      contextWindow: contextWindowResolution.contextWindow,
      usedTokens: context.usedTokens,
      remainingTokens: context.remainingTokens,
      usagePct: context.usagePct,
      contextSource: contextWindowResolution.source,
    }
  }, [mode, sessionUsage, currentRunUsage, contextWindowResolution])

  const setTraceStatus = useCallback((next: TracePersistenceStatus) => {
    if (tracePersistenceStatusRef.current === next) return
    tracePersistenceStatusRef.current = next
    setTracePersistenceStatus(next)
  }, [])

  const flushRunEventBuffer = useCallback(
    async (options?: { force?: boolean; reason?: string }) => {
      if (runEventFlushTimerRef.current !== null) {
        clearTimeout(runEventFlushTimerRef.current)
        runEventFlushTimerRef.current = null
      }

      if (runEventFlushPromiseRef.current) {
        runEventFlushAgainRef.current = true
        if (options?.force) {
          runEventFlushAgainForceRef.current = true
        }
        if (options?.force) {
          await runEventFlushPromiseRef.current
          // Force flush callers must wait for any trailing flush queued while an
          // earlier flush was in flight.
          await flushRunEventBuffer({ ...options, force: true })
        }
        return
      }

      if (runEventBufferRef.current.length === 0) return

      const doFlush = async () => {
        const pending = runEventBufferRef.current.splice(0, runEventBufferRef.current.length)
        if (pending.length === 0) return

        const grouped = new Map<Id<'agentRuns'>, Array<BufferedRunEvent['event']>>()
        for (const entry of pending) {
          const events = grouped.get(entry.runId)
          if (events) {
            events.push(entry.event)
          } else {
            grouped.set(entry.runId, [entry.event])
          }
        }

        try {
          for (const [runId, events] of grouped) {
            await appendRunEvents({ runId, events })
          }
          setTraceStatus('live')
        } catch (err) {
          runEventBufferRef.current = [...pending, ...runEventBufferRef.current]
          setTraceStatus('degraded')
          logUseAgentError(
            `Failed to flush run event buffer${options?.reason ? ` (${options.reason})` : ''}`,
            err
          )
          // Best-effort retry path for transient failures; avoids throwing into UI flow.
          if (runEventFlushTimerRef.current === null) {
            runEventFlushTimerRef.current = setTimeout(() => {
              runEventFlushTimerRef.current = null
              void flushRunEventBuffer({ reason: 'retry' })
            }, 1000)
          }
        }
      }

      runEventFlushPromiseRef.current = doFlush().finally(() => {
        runEventFlushPromiseRef.current = null
      })
      await runEventFlushPromiseRef.current

      if (runEventFlushAgainRef.current) {
        const pendingForce = runEventFlushAgainForceRef.current
        runEventFlushAgainRef.current = false
        runEventFlushAgainForceRef.current = false
        if (runEventBufferRef.current.length > 0) {
          await flushRunEventBuffer({
            ...options,
            force: Boolean(options?.force) || pendingForce,
          })
        }
      }
    },
    [appendRunEvents, setTraceStatus]
  )

  const scheduleRunEventFlush = useCallback(() => {
    if (runEventFlushTimerRef.current !== null) return
    runEventFlushTimerRef.current = setTimeout(() => {
      runEventFlushTimerRef.current = null
      void flushRunEventBuffer({ reason: 'timer' })
    }, 400)
  }, [flushRunEventBuffer])

  const appendRunEvent = useCallback(
    async (event: RunEventInput, options?: { forceFlush?: boolean }) => {
      const runId = runIdRef.current
      if (!runId) return
      runSequenceRef.current += 1
      runEventBufferRef.current.push({
        runId,
        event: { sequence: runSequenceRef.current, ...event },
      })

      if (runEventBufferRef.current.length >= 10 || options?.forceFlush) {
        await flushRunEventBuffer({
          force: Boolean(options?.forceFlush),
          reason: options?.forceFlush ? 'force' : 'threshold',
        })
        return
      }

      scheduleRunEventFlush()
    },
    [flushRunEventBuffer, scheduleRunEventFlush]
  )

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
    if (rafFlushRef.current !== null) {
      cancelAnimationFrame(rafFlushRef.current)
      rafFlushRef.current = null
    }
    if (runEventFlushTimerRef.current !== null) {
      clearTimeout(runEventFlushTimerRef.current)
      runEventFlushTimerRef.current = null
    }
    if (runId) {
      // Keep runId/sequence until sendMessage finalizes the stopped run so
      // trailing abort-unwind events can still be buffered and persisted.
      void flushRunEventBuffer({ force: true, reason: 'stop' })
    }
    setStatus('idle')
  }, [flushRunEventBuffer, pendingSpec])

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
    setError(null)
    setCurrentIteration(0)
    setCurrentRunUsage(undefined)
    setCurrentSpec(null)
    setPendingSpec(null)
  }, [projectId, chatId, messages, saveSessionSummaryMutation])

  const approvePendingSpec = useCallback(
    (spec?: FormalSpecification) => {
      const nextSpec = spec ?? pendingSpec
      if (!nextSpec) return
      setPendingSpec(null)
      setCurrentSpec(nextSpec)
      setStatus('thinking')
      runtimeRef.current?.resolveSpecApproval?.('approve', nextSpec)
    },
    [pendingSpec]
  )

  const updatePendingSpecDraft = useCallback((spec: FormalSpecification) => {
    setPendingSpec(spec)
    setCurrentSpec(spec)
  }, [])

  const cancelPendingSpec = useCallback(() => {
    setPendingSpec(null)
    setCurrentSpec(null)
    runtimeRef.current?.resolveSpecApproval?.('cancel')
    setStatus('idle')
  }, [])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }, [])

  // Hydrate local chat state from Convex when chat changes.
  useEffect(() => {
    if (!persistedMessages || isRunningRef.current) return
    const runtimeSettings = getReasoningRuntimeSettings()
    setCurrentRunUsage(undefined)

    const hydrated: UseAgentReturn['messages'] = persistedMessages
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => {
        const firstAnnotation = Array.isArray(msg.annotations)
          ? (msg.annotations[0] as PersistedMessageAnnotation | undefined)
          : undefined

        // Map stored and legacy modes consistently to the current 4-mode model.
        const hydratedMode = normalizeChatMode(firstAnnotation?.mode, mode)

        return {
          id: msg._id,
          role: msg.role as 'user' | 'assistant' | 'tool',
          content: msg.content,
          createdAt: msg.createdAt,
          reasoningContent:
            runtimeSettings.showReasoningPanel &&
            typeof firstAnnotation?.reasoningSummary === 'string'
              ? firstAnnotation.reasoningSummary
              : '',
          mode: hydratedMode,
          toolCalls: Array.isArray(firstAnnotation?.toolCalls)
            ? (firstAnnotation?.toolCalls as ToolCallInfo[])
            : ([] as ToolCallInfo[]),
          annotations: {
            mode: hydratedMode,
            model: typeof firstAnnotation?.model === 'string' ? firstAnnotation.model : undefined,
            provider:
              typeof firstAnnotation?.provider === 'string' ? firstAnnotation.provider : undefined,
            tokenCount: toOptionalFiniteNumber(firstAnnotation?.tokenCount),
            promptTokens: toOptionalFiniteNumber(firstAnnotation?.promptTokens),
            completionTokens: toOptionalFiniteNumber(firstAnnotation?.completionTokens),
            totalTokens: toOptionalFiniteNumber(firstAnnotation?.totalTokens),
            tokenSource:
              firstAnnotation?.tokenSource === 'exact' ||
              firstAnnotation?.tokenSource === 'estimated'
                ? firstAnnotation.tokenSource
                : undefined,
            reasoningTokens: toOptionalFiniteNumber(firstAnnotation?.reasoningTokens),
            contextWindow: toOptionalFiniteNumber(firstAnnotation?.contextWindow),
            contextUsedTokens: toOptionalFiniteNumber(firstAnnotation?.contextUsedTokens),
            contextRemainingTokens: toOptionalFiniteNumber(firstAnnotation?.contextRemainingTokens),
            contextUsagePct: toOptionalFiniteNumber(firstAnnotation?.contextUsagePct),
            contextSource:
              firstAnnotation?.contextSource === 'map' ||
              firstAnnotation?.contextSource === 'provider' ||
              firstAnnotation?.contextSource === 'fallback'
                ? firstAnnotation.contextSource
                : undefined,
          },
        }
      })

    setMessages(hydrated)
  }, [chatId, persistedMessages, getReasoningRuntimeSettings, mode])

  // Main submit handler
  const sendMessage = useCallback(
    async (rawContent: string, contextFiles?: string[]) => {
      const userContent = rawContent.trim()
      if (!userContent || isRunningRef.current) return
      setInput('')

      // Capture a snapshot of prior conversation for prompt building.
      // Note: we exclude tool messages here because our UI message shape
      // doesn't retain tool_call_id, which some providers require.
      // IMPORTANT: Claude Code-style mode separation.
      // When in Plan mode, don't include Build messages in context (and vice versa),
      // otherwise the model continues implementation even after switching modes.
      const previousMessagesSnapshot = messages
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.mode === mode)
        .map((m) => ({ role: m.role, content: m.content }))

      const estimatedPromptTokens = estimatePromptTokens({
        providerType,
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

      // Add user message to local state
      const userMessageId = `msg-${Date.now()}-user`
      setMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          role: 'user',
          content: userContent,
          mode,
          createdAt: Date.now(),
        },
      ])

      // Persist user message to Convex
      try {
        await addMessage({
          chatId,
          role: 'user',
          content: userContent,
          annotations: [
            {
              mode,
              model,
              provider: provider?.config?.provider,
            },
          ],
        })
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
        runIdRef.current = runId
        runSequenceRef.current = 0
        let runFinalized = false

        const finalizeRunCompleted = async (summary?: string, usage?: Record<string, unknown>) => {
          if (!runIdRef.current || runFinalized) return
          runFinalized = true
          await flushRunEventBuffer({ force: true, reason: 'complete' })
          await completeRun({
            runId: runIdRef.current,
            summary,
            usage,
          })
          runIdRef.current = null
          runSequenceRef.current = 0
        }

        const finalizeRunFailed = async (message: string) => {
          if (!runIdRef.current || runFinalized) return
          runFinalized = true
          await flushRunEventBuffer({ force: true, reason: 'fail' })
          await failRun({
            runId: runIdRef.current,
            error: message,
          })
          runIdRef.current = null
          runSequenceRef.current = 0
        }

        const finalizeRunStopped = async () => {
          if (!runIdRef.current || runFinalized) return
          runFinalized = true
          await flushRunEventBuffer({ force: true, reason: 'stop' })
          await stopRun({
            runId: runIdRef.current,
          })
          runIdRef.current = null
          runSequenceRef.current = 0
        }

        await appendRunEvent({
          type: 'run_started',
          content: userContent,
          status: 'running',
        })

        const promptContext: PromptContext = {
          projectId,
          chatId,
          userId,
          projectName,
          projectDescription,
          chatMode: mode,
          // Use the configured provider type (e.g. "zai") rather than the
          // implementation class name (e.g. "openai-compatible").
          provider: provider?.config?.provider || 'openai',
          previousMessages: previousMessagesSnapshot,
          projectOverview: projectOverviewContent ?? undefined,
          memoryBank: memoryBankContent ?? undefined,
          userMessage:
            contextFiles && contextFiles.length > 0
              ? `${userContent}\n\n[Context files referenced by user: ${contextFiles.map((f) => `@file:${f}`).join(', ')}. Read these files first when relevant to the request.]`
              : userContent,
          customInstructions: architectBrainstormEnabled
            ? 'Architect brainstorming protocol: enabled'
            : undefined,
        }

        // Create runtime config with deduplication
        // Note: maxToolCallsPerIteration is set high to allow batch file generation
        // The AI should be able to generate as many files as needed in one iteration
        const runtimeConfig: RuntimeConfig = {
          maxIterations: 10,
          maxToolCallsPerIteration: 50,
          enableToolDeduplication: true,
          toolLoopThreshold: 3,
          harnessSessionID: `harness_run_${runId}`,
          harnessAutoResume: true,
          harnessSpecApprovalMode: 'interactive',
        }

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
        const runtime = createAgentRuntime(
          {
            provider,
            model,
            maxIterations: runtimeConfig.maxIterations,
            harnessCheckpointStore: new ConvexCheckpointStore(
              convex as unknown as {
                query: (func: unknown, args: Record<string, unknown>) => Promise<unknown>
                mutation: (func: unknown, args: Record<string, unknown>) => Promise<unknown>
              },
              {
                runId,
                chatId,
                projectId,
              }
            ),
            // Risk interrupt UI is not yet implemented — agent permission layer handles
            // write_files/run_command authorization (build agent allows both by default)
            harnessEnableRiskInterrupts: false,
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
            usedTokens: sessionUsage.totalTokens + runUsage.totalTokens,
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
          rafFlushRef.current = requestAnimationFrame(() => {
            pendingPaint = false
            rafFlushRef.current = null
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

        for await (const event of runtime.run(promptContext, runtimeConfig)) {
          // Check for abort
          if (abortControllerRef.current?.signal.aborted) {
            break
          }

          switch (event.type) {
            case 'thinking':
            case 'status_thinking': {
              setStatus('thinking')
              if (event.content) {
                void appendRunEvent({
                  type: 'status',
                  content: event.content,
                  status: 'thinking',
                })
              }
              // Extract iteration number from content
              const iterationMatch = event.content?.match(/Iteration (\d+)/)
              if (iterationMatch) {
                setCurrentIteration(parseInt(iterationMatch[1], 10))
              }
              break
            }

            case 'reset': {
              // Runtime requested that we reset the current assistant message
              // (e.g. Plan Mode auto-rewrite).
              // Keep the existing content visible to avoid the message "vanishing".
              // We’ll replace it cleanly when the first rewrite text chunk arrives.
              replaceOnNextText = true
              assistantToolCalls = []
              void appendRunEvent({
                type: 'reset',
                content: event.resetReason ?? 'rewrite',
              })
              if (!rewriteNoticeShown) {
                rewriteNoticeShown = true
                setMessages((prev) => {
                  const existingIndex = prev.findIndex((m) => m.id === assistantMessageId)
                  if (existingIndex < 0) return prev
                  const updated = [...prev]
                  const existing = updated[existingIndex]!
                  updated[existingIndex] = {
                    ...existing,
                    mode,
                    toolCalls: [],
                    content:
                      (existing.content ? existing.content + '\n\n' : '') +
                      '— Rewriting to match mode… —',
                  }
                  return updated
                })
              }
              break
            }

            case 'text':
              setStatus('streaming')
              if (event.content) {
                if (replaceOnNextText) {
                  replaceOnNextText = false
                  assistantContent = ''
                  // Immediately clear the visible content so we replace instead of append.
                  setMessages((prev) => {
                    const existingIndex = prev.findIndex((m) => m.id === assistantMessageId)
                    if (existingIndex < 0) return prev
                    const updated = [...prev]
                    updated[existingIndex] = {
                      ...updated[existingIndex]!,
                      content: '',
                      reasoningContent: '',
                      mode,
                      toolCalls: [],
                    }
                    return updated
                  })
                }
                assistantContent += event.content
                runUsage = {
                  ...runUsage,
                  completionTokens: estimateCompletionTokens({
                    providerType,
                    model,
                    content: assistantContent,
                  }),
                }
                runUsage.totalTokens = runUsage.promptTokens + runUsage.completionTokens
                setCurrentRunUsage(runUsage)
                // Paint at most once per animation frame to avoid render thrash
                // while still feeling like true streaming.
                schedulePaint()
              }
              break
            case 'progress_step': {
              if (event.content) {
                const step: ProgressStep = {
                  id: `progress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  content: event.content,
                  status: event.progressStatus ?? 'running',
                  category: event.progressCategory ?? 'other',
                  details:
                    event.progressToolName ||
                    event.progressToolCallId ||
                    event.progressArgs ||
                    event.progressDurationMs ||
                    event.progressError
                      ? {
                          toolName: event.progressToolName,
                          toolCallId: event.progressToolCallId,
                          argsSummary: summarizeArgs(event.progressArgs),
                          durationMs: event.progressDurationMs,
                          errorExcerpt: event.progressError?.slice(0, 160),
                          targetFilePaths: extractTargetFilePaths(
                            event.progressToolName,
                            event.progressArgs
                          ),
                          hasArtifactTarget: Boolean(event.progressHasArtifactTarget),
                        }
                      : undefined,
                  createdAt: Date.now(),
                }
                setProgressSteps((prev) => [...prev, step].slice(-30))
                void appendRunEvent({
                  type: 'progress_step',
                  content: step.content,
                  status: step.status,
                  progressCategory: step.category,
                  progressToolName: step.details?.toolName,
                  toolCallId: step.details?.toolCallId,
                  progressHasArtifactTarget: step.details?.hasArtifactTarget,
                  targetFilePaths: step.details?.targetFilePaths,
                  toolName: step.details?.toolName,
                  args: event.progressArgs,
                  durationMs: step.details?.durationMs,
                  error: step.details?.errorExcerpt,
                })
              }
              break
            }
            case 'spec_pending_approval':
              if (event.spec) {
                setPendingSpec(event.spec)
                setCurrentSpec(event.spec)
                setStatus('idle')
                void appendRunEvent({
                  type: event.type,
                  content: event.spec.intent.goal,
                  status: event.spec.status,
                })
              }
              break
            case 'spec_generated': {
              if (event.spec) {
                setPendingSpec(null)
                setCurrentSpec(event.spec)
                void appendRunEvent({
                  type: event.type,
                  content: event.spec.intent.goal,
                  status: event.spec.status,
                })
              }
              break
            }
            case 'spec_verification': {
              setPendingSpec(null)
              if (event.spec) {
                setCurrentSpec(event.spec)
              }
              void appendRunEvent({
                type: 'spec_verification',
                content: event.verification?.passed
                  ? 'Specification verified'
                  : 'Specification failed',
                status: event.verification?.passed ? 'verified' : 'failed',
              })
              break
            }
            case 'reasoning':
              if (runtimeSettings.showReasoningPanel && event.reasoningContent) {
                assistantReasoning += event.reasoningContent
                schedulePaint()
              }
              break

            case 'tool_call':
              setStatus('executing_tools')
              if (event.toolCall) {
                const toolInfo: ToolCallInfo = {
                  id: event.toolCall.id,
                  name: event.toolCall.function.name,
                  args: JSON.parse(event.toolCall.function.arguments),
                  status: 'pending',
                }
                assistantToolCalls.push(toolInfo)
                setToolCalls((prev) => [...prev, toolInfo])
                void appendRunEvent({
                  type: 'tool_call',
                  toolCallId: toolInfo.id,
                  toolName: toolInfo.name,
                  args: toolInfo.args,
                  status: toolInfo.status,
                })

                // Update assistant message with tool calls
                setMessages((prev) => {
                  const existingIndex = prev.findIndex((m) => m.id === assistantMessageId)
                  if (existingIndex >= 0) {
                    const updated = [...prev]
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      mode,
                      toolCalls: assistantToolCalls,
                    }
                    return updated
                  }
                  return prev
                })
              }
              break

            case 'tool_result':
              if (event.toolResult) {
                // Update tool call status
                setToolCalls((prev) =>
                  prev.map((tc) =>
                    tc.id === event.toolResult!.toolCallId
                      ? {
                          ...tc,
                          status: event.toolResult!.error ? 'error' : 'completed',
                          result: {
                            output: event.toolResult!.output,
                            error: event.toolResult!.error,
                            durationMs: event.toolResult!.durationMs,
                          },
                        }
                      : tc
                  )
                )

                // Update assistant message tool calls
                assistantToolCalls = assistantToolCalls.map((tc) =>
                  tc.id === event.toolResult!.toolCallId
                    ? {
                        ...tc,
                        status: event.toolResult!.error ? 'error' : 'completed',
                        result: {
                          output: event.toolResult!.output,
                          error: event.toolResult!.error,
                          durationMs: event.toolResult!.durationMs,
                        },
                      }
                    : tc
                )

                setMessages((prev) => {
                  const existingIndex = prev.findIndex((m) => m.id === assistantMessageId)
                  if (existingIndex >= 0) {
                    const updated = [...prev]
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      toolCalls: assistantToolCalls,
                    }
                    return updated
                  }
                  return prev
                })

                void appendRunEvent({
                  type: 'tool_result',
                  toolCallId: event.toolResult.toolCallId,
                  toolName: event.toolResult.toolName,
                  output: event.toolResult.output,
                  error: event.toolResult.error,
                  durationMs: event.toolResult.durationMs,
                  status: event.toolResult.error ? 'error' : 'completed',
                })
              }
              break

            case 'complete':
              setPendingSpec(null)
              setStatus('complete')
              isRunningRef.current = false
              if (event.usage) {
                runUsage = {
                  promptTokens: toFiniteNumber(event.usage.promptTokens),
                  completionTokens: toFiniteNumber(event.usage.completionTokens),
                  totalTokens: toFiniteNumber(
                    event.usage.totalTokens,
                    toFiniteNumber(event.usage.promptTokens) +
                      toFiniteNumber(event.usage.completionTokens)
                  ),
                  source: 'exact',
                }
              }
              setCurrentRunUsage(runUsage)

              // Persist assistant message to Convex
              try {
                const context = computeContextMetrics({
                  usedTokens: sessionUsage.totalTokens + runUsage.totalTokens,
                  contextWindow: contextWindowResolution.contextWindow,
                })
                const annotations: Record<string, unknown> = {
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
                  ...(assistantToolCalls.length > 0 ? { toolCalls: assistantToolCalls } : {}),
                }
                if (assistantReasoning) {
                  annotations.reasoningSummary = assistantReasoning
                  if (runUsage.completionTokens) {
                    annotations.reasoningTokens = runUsage.completionTokens
                  }
                }

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
                    usage: event.usage as Record<string, unknown> | undefined,
                    status: 'completed',
                  },
                  { forceFlush: true }
                )
                await finalizeRunCompleted(
                  assistantContent,
                  event.usage as Record<string, unknown> | undefined
                )
              } catch (err) {
                logUseAgentError('Failed to persist assistant message', err)
              }
              break

            case 'error': {
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
                await finalizeRunStopped()
                break
              }
              const userFacing = getUserFacingAgentError(event.error)
              setStatus('error')
              setError(userFacing.description)
              isRunningRef.current = false
              await appendRunEvent(
                {
                  type: 'error',
                  error: event.error || 'Unknown error',
                  status: 'failed',
                },
                { forceFlush: true }
              )
              await finalizeRunFailed(event.error || 'Unknown error')
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
          await finalizeRunStopped()
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (message === 'Specification approval cancelled') {
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
          if (runIdRef.current) {
            await flushRunEventBuffer({ force: true, reason: 'spec-cancel' })
            await stopRun({
              runId: runIdRef.current,
            })
            runIdRef.current = null
            runSequenceRef.current = 0
          }
          return
        }
        const userFacing = getUserFacingAgentError(message)
        setStatus('error')
        setError(userFacing.description)
        isRunningRef.current = false
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
            runIdRef.current = null
            runSequenceRef.current = 0
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
      providerType,
      architectBrainstormEnabled,
      addMessage,
      createRun,
      appendRunEvent,
      completeRun,
      convex,
      convexClient,
      failRun,
      flushRunEventBuffer,
      stopRun,
      userId,
      getReasoningRuntimeSettings,
      sessionUsage.totalTokens,
      contextWindowResolution.contextWindow,
      contextWindowResolution.source,
      memoryBankContent,
      projectName,
      projectDescription,
      projectOverviewContent,
    ]
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

      const promptContext: PromptContext = {
        projectId,
        chatId,
        userId,
        projectName,
        projectDescription,
        chatMode: scenarioMode,
        provider: provider.config?.provider || 'openai',
        previousMessages: [],
        projectOverview: projectOverviewContent ?? undefined,
        memoryBank: memoryBankContent ?? undefined,
        userMessage: textInput,
        customInstructions: architectBrainstormEnabled
          ? 'Architect brainstorming protocol: enabled'
          : undefined,
      }

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
    ]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

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
    pendingSpec,
    pendingArtifacts,
    memoryBank: memoryBankContent,
    updateMemoryBank: async (content: string) => {
      if (!projectId) return
      await updateMemoryBankMutation({ projectId: projectId as Id<'projects'>, content })
    },
    projectOverview: projectOverviewContent,
    sendMessage,
    runEvalScenario,
    handleSubmit,
    handleInputChange,
    stop,
    clear,
    approvePendingSpec,
    updatePendingSpecDraft,
    cancelPendingSpec,
    error,
    tracePersistenceStatus,
  }
}

/**
 * Hook for simple agent execution without streaming
 * Useful for one-off agent tasks
 */
export function useAgentSync(options: UseAgentOptions) {
  const [result, setResult] = useState<{
    content: string
    toolResults: AgentEvent[]
    error?: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const run = useCallback(
    async (_content: string) => {
      setIsLoading(true)
      setResult(null)

      try {
        // TODO: Implement sync agent execution
        // This would call the runAgent helper function
        setResult({
          content: 'Agent execution placeholder',
          toolResults: [],
        })
      } catch (error) {
        setResult({
          content: '',
          toolResults: [],
          error: error instanceof Error ? error.message : String(error),
        })
      } finally {
        setIsLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options will be used when implementing the TODO
    [options]
  )

  return { run, result, isLoading }
}

export default useAgent
