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
  type RuntimeConfig,
} from '../lib/agent'
import { extractTargetFilePaths } from '../components/chat/live-run-utils'
import type { PromptContext } from '../lib/agent/prompt-library'
import { toast } from 'sonner'

/**
 * Chat mode type
 */
type ChatMode = 'discuss' | 'build'

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

/**
 * Options for useAgent hook
 */
interface UseAgentOptions {
  chatId: Id<'chats'>
  projectId: Id<'projects'>
  mode: ChatMode
  provider: LLMProvider
  model?: string
  discussBrainstormEnabled?: boolean
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

  // Artifacts
  pendingArtifacts: Array<{ _id: string }>

  // Actions
  handleSubmit: (e?: React.FormEvent) => Promise<void>
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  stop: () => void
  clear: () => void

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
    mode,
    provider,
    model = 'gpt-4o',
    discussBrainstormEnabled = false,
  } = options

  const convex = useConvex()

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

  // Refs for controlling the agent
  const abortControllerRef = useRef<AbortController | null>(null)
  const isRunningRef = useRef(false)
  const toolContextRef = useRef<ReturnType<typeof createToolContext> | null>(null)
  const rafFlushRef = useRef<number | null>(null)
  const runIdRef = useRef<Id<'agentRuns'> | null>(null)
  const runSequenceRef = useRef(0)

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

    toolContextRef.current = createToolContext(
      projectId,
      chatId,
      userId,
      convex,
      artifactQueue.current,
      {
        files: { batchGet: api.files.batchGet },
        jobs: { create: api.jobs.create, updateStatus: api.jobs.updateStatus },
        artifacts: { create: api.artifacts.create },
      }
    )
  }, [projectId, chatId, convex, userId])

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
      } catch {
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

  const appendRunEvent = useCallback(
    async (event: RunEventInput) => {
      if (!runIdRef.current) return
      runSequenceRef.current += 1
      try {
        await appendRunEvents({
          runId: runIdRef.current,
          events: [{ sequence: runSequenceRef.current, ...event }],
        })
      } catch (err) {
        console.error('Failed to append run event:', err)
      }
    },
    [appendRunEvents]
  )

  // Stop the agent
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (rafFlushRef.current !== null) {
      cancelAnimationFrame(rafFlushRef.current)
      rafFlushRef.current = null
    }
    if (runIdRef.current) {
      void stopRun({ runId: runIdRef.current })
      runIdRef.current = null
      runSequenceRef.current = 0
    }
    isRunningRef.current = false
    setStatus('idle')
  }, [stopRun])

  // Clear messages
  const clear = useCallback(() => {
    setMessages([])
    setToolCalls([])
    setProgressSteps([])
    setError(null)
    setCurrentIteration(0)
    setCurrentRunUsage(undefined)
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
        const hydratedMode: ChatMode = firstAnnotation?.mode === 'build' ? 'build' : 'discuss'

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
            ? (firstAnnotation.toolCalls as ToolCallInfo[])
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
  }, [chatId, persistedMessages, getReasoningRuntimeSettings])

  // Main submit handler
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()

      if (!input.trim() || isRunningRef.current) return

      const userContent = input.trim()
      setInput('')

      // Capture a snapshot of prior conversation for prompt building.
      // Note: we exclude tool messages here because our UI message shape
      // doesn't retain tool_call_id, which some providers require.
      // IMPORTANT: Claude Code-style mode separation.
      // When in Discuss (Plan Mode), don't include Build messages in context (and vice versa),
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
        })
      } catch (err) {
        console.error('Failed to persist user message:', err)
      }

      // Start agent execution
      isRunningRef.current = true
      abortControllerRef.current = new AbortController()
      setStatus('thinking')
      setError(null)
      setProgressSteps([])

      try {
        // Create prompt context
        if (!userId) {
          throw new Error('User not authenticated')
        }

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
          chatMode: mode,
          // Use the configured provider type (e.g. "zai") rather than the
          // implementation class name (e.g. "openai-compatible").
          provider: provider?.config?.provider || 'openai',
          previousMessages: previousMessagesSnapshot,
          userMessage: userContent,
          customInstructions: discussBrainstormEnabled
            ? 'Discuss brainstorming protocol: enabled'
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
        }

        // Get tool context
        if (!userId) {
          throw new Error('User not authenticated')
        }

        const toolContext =
          toolContextRef.current ||
          createToolContext(
            projectId,
            chatId,
            userId,
            {
              query: async () => [],
              mutation: async () => '',
            },
            artifactQueue.current,
            {
              files: { batchGet: null },
              jobs: { create: null, updateStatus: null },
              artifacts: { create: null },
            }
          )

        // Create agent runtime
        const runtimeSettings = getReasoningRuntimeSettings()
        const runtime = createAgentRuntime(
          {
            provider,
            model,
            maxIterations: runtimeConfig.maxIterations,
            ...(runtimeSettings.reasoning ? { reasoning: runtimeSettings.reasoning } : {}),
          },
          toolContext
        )

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
                    event.progressArgs ||
                    event.progressDurationMs ||
                    event.progressError
                      ? {
                          toolName: event.progressToolName,
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
                void appendRunEvent({
                  type: 'assistant_message',
                  content: assistantContent,
                  usage: event.usage as Record<string, unknown> | undefined,
                  status: 'completed',
                })
                await finalizeRunCompleted(
                  assistantContent,
                  event.usage as Record<string, unknown> | undefined
                )
              } catch (err) {
                console.error('Failed to persist assistant message:', err)
              }
              break

            case 'error':
              setStatus('error')
              setError(event.error || 'Unknown error')
              isRunningRef.current = false
              void appendRunEvent({
                type: 'error',
                error: event.error || 'Unknown error',
                status: 'failed',
              })
              await finalizeRunFailed(event.error || 'Unknown error')
              toast.error('Agent error', {
                description: event.error,
              })
              break
          }
        }

        // Reset status if still running (e.g., aborted)
        if (isRunningRef.current) {
          setStatus('idle')
          isRunningRef.current = false
          await finalizeRunStopped()
        }
      } catch (err) {
        setStatus('error')
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        isRunningRef.current = false
        void appendRunEvent({
          type: 'error',
          error: message,
          status: 'failed',
        })
        if (runIdRef.current) {
          try {
            await failRun({ runId: runIdRef.current, error: message })
          } catch (runErr) {
            console.error('Failed to finalize run failure:', runErr)
          } finally {
            runIdRef.current = null
            runSequenceRef.current = 0
          }
        }
        toast.error('Agent failed', {
          description: message,
        })
      }
    },
    [
      input,
      messages,
      chatId,
      projectId,
      mode,
      provider,
      model,
      providerType,
      discussBrainstormEnabled,
      addMessage,
      createRun,
      appendRunEvent,
      completeRun,
      failRun,
      stopRun,
      userId,
      getReasoningRuntimeSettings,
      sessionUsage.totalTokens,
      contextWindowResolution.contextWindow,
      contextWindowResolution.source,
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
    pendingArtifacts,
    handleSubmit,
    handleInputChange,
    stop,
    clear,
    error,
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
