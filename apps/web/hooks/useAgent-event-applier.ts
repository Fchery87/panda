import type { Id } from '@convex/_generated/dataModel'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { AgentEvent } from '../lib/agent/runtime'
import type { FormalSpecification, VerificationResult } from '../lib/agent/spec/types'
import type {
  CreateSpecInput,
  SpecPersistenceState,
  UpdateSpecInput,
} from '../lib/agent/spec/persistence'
import type { ChatMode } from '../lib/agent/prompt-library'
import type { ToolCallInfo, PersistedRunEventInfo, TokenSource } from '@/components/chat/types'
import type { Message } from './useMessageHistory'
import type { UsageTotals } from './useTokenUsageMetrics'
import {
  applyToolResult,
  buildProgressStep,
  buildSnapshotProgressStep,
  buildToolCallInfo,
  buildVerificationProgressStep,
  type ProgressStep,
} from './useAgent-event-utils'
import {
  persistGeneratedSpec,
  persistPendingApprovalSpec,
  persistVerifiedSpec,
} from './useAgent-spec-events'

type AgentStatus = 'idle' | 'thinking' | 'streaming' | 'executing_tools' | 'complete' | 'error'

type RunEventInput = PersistedRunEventInfo

export interface EventApplierMutableState {
  assistantContent: string
  assistantReasoning: string
  assistantToolCalls: ToolCallInfo[]
  replaceOnNextText: boolean
  rewriteNoticeShown: boolean
  runUsage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    source: 'exact' | 'estimated'
  }
}

export function applyNonTerminalAgentEvent(args: {
  event: AgentEvent
  mode: ChatMode
  assistantMessageId: string
  projectId: Id<'projects'>
  chatId: Id<'chats'>
  runId: Id<'agentRuns'> | null
  planSteps: string[]
  completedPlanStepIndexesRef: MutableRefObject<number[]>
  specPersistence: SpecPersistenceState
  runtimeSettings: {
    showReasoningPanel: boolean
  }
  mutable: EventApplierMutableState
  estimateCompletionTokens: (content: string) => number
  appendRunEvent: (event: RunEventInput, options?: { forceFlush?: boolean }) => Promise<void>
  createSpec: (args: CreateSpecInput) => Promise<Id<'specifications'>>
  updateSpec: (args: { specId: Id<'specifications'>; updates: UpdateSpecInput }) => Promise<unknown>
  setStatus: Dispatch<SetStateAction<AgentStatus>>
  setCurrentIteration: Dispatch<SetStateAction<number>>
  setCurrentRunUsage: Dispatch<SetStateAction<(UsageTotals & { source: TokenSource }) | undefined>>
  setProgressSteps: Dispatch<SetStateAction<ProgressStep[]>>
  setPendingSpec: Dispatch<SetStateAction<FormalSpecification | null>>
  setCurrentSpec: Dispatch<SetStateAction<FormalSpecification | null>>
  setToolCalls: Dispatch<SetStateAction<ToolCallInfo[]>>
  setMessages: Dispatch<SetStateAction<Message[]>>
  schedulePaint: () => void
}): boolean {
  const {
    event,
    mode,
    assistantMessageId,
    projectId,
    chatId,
    runId,
    planSteps,
    completedPlanStepIndexesRef,
    specPersistence,
    runtimeSettings,
    mutable,
    estimateCompletionTokens,
    appendRunEvent,
    createSpec,
    updateSpec,
    setStatus,
    setCurrentIteration,
    setCurrentRunUsage,
    setProgressSteps,
    setPendingSpec,
    setCurrentSpec,
    setToolCalls,
    setMessages,
    schedulePaint,
  } = args

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
      const iterationMatch = event.content?.match(/Iteration (\d+)/)
      if (iterationMatch) {
        setCurrentIteration(parseInt(iterationMatch[1], 10))
      }
      return true
    }

    case 'retry': {
      if (event.content) {
        void appendRunEvent({
          type: 'status',
          content: event.content,
          status: 'retrying',
        })
        const step: ProgressStep = {
          id: `progress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          content: event.content,
          status: 'running',
          category: 'other',
          createdAt: Date.now(),
        }
        setProgressSteps((prev) => [...prev, step].slice(-30))
      }
      return true
    }

    case 'reset': {
      mutable.replaceOnNextText = true
      mutable.assistantToolCalls = []
      void appendRunEvent({
        type: 'reset',
        content: event.resetReason ?? 'rewrite',
      })
      if (!mutable.rewriteNoticeShown) {
        mutable.rewriteNoticeShown = true
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
              (existing.content ? existing.content + '\n\n' : '') + '— Rewriting to match mode… —',
          }
          return updated
        })
      }
      return true
    }

    case 'text': {
      setStatus('streaming')
      if (event.content) {
        if (mutable.replaceOnNextText) {
          mutable.replaceOnNextText = false
          mutable.assistantContent = ''
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
        mutable.assistantContent += event.content
        mutable.runUsage = {
          ...mutable.runUsage,
          completionTokens: estimateCompletionTokens(mutable.assistantContent),
        }
        mutable.runUsage.totalTokens =
          mutable.runUsage.promptTokens + mutable.runUsage.completionTokens
        setCurrentRunUsage(mutable.runUsage)
        schedulePaint()
      }
      return true
    }

    case 'progress_step': {
      if (event.content) {
        const step: ProgressStep = buildProgressStep({
          content: event.content,
          progressStatus: event.progressStatus,
          progressCategory: event.progressCategory,
          progressToolName: event.progressToolName,
          progressToolCallId: event.progressToolCallId,
          progressArgs: event.progressArgs,
          progressDurationMs: event.progressDurationMs,
          progressError: event.progressError,
          progressHasArtifactTarget: event.progressHasArtifactTarget,
          planSteps,
          completedPlanStepIndexes: completedPlanStepIndexesRef.current,
        })
        if (step.completedPlanStepIndexes) {
          completedPlanStepIndexesRef.current = step.completedPlanStepIndexes
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
          planStepIndex: step.planStepIndex,
          planStepTitle: step.planStepTitle,
          planTotalSteps: step.planTotalSteps,
          completedPlanStepIndexes: step.completedPlanStepIndexes,
        })
      }
      return true
    }

    case 'spec_pending_approval': {
      if (event.spec) {
        setPendingSpec(event.spec)
        setCurrentSpec(event.spec)
        setStatus('idle')
        void appendRunEvent({
          type: event.type,
          content: event.spec.intent.goal,
          status: event.spec.status,
        })
        persistPendingApprovalSpec({
          spec: event.spec,
          projectId,
          chatId,
          runId: runId ?? undefined,
          specPersistence,
          createSpec,
        })
      }
      return true
    }

    case 'spec_generated': {
      if (event.spec) {
        setPendingSpec(null)
        setCurrentSpec(event.spec)
        void appendRunEvent({
          type: event.type,
          content: event.spec.intent.goal,
          status: event.spec.status,
        })
        persistGeneratedSpec({
          spec: event.spec,
          projectId,
          chatId,
          runId: runId ?? undefined,
          specPersistence,
          createSpec,
          updateSpec,
        })
      }
      return true
    }

    case 'spec_verification': {
      setPendingSpec(null)
      if (event.spec) {
        setCurrentSpec(event.spec)
        persistVerifiedSpec({
          spec: event.spec,
          verificationResults: (event.verification?.results || []) as VerificationResult[],
          specPersistence,
          updateSpec,
        })
      }
      const verificationStep = buildVerificationProgressStep({
        passed: event.verification?.passed,
      })
      setProgressSteps((prev) => [...prev, verificationStep].slice(-30))
      void appendRunEvent({
        type: 'spec_verification',
        content: event.verification?.passed ? 'Specification verified' : 'Specification failed',
        status: event.verification?.passed ? 'verified' : 'failed',
      })
      return true
    }

    case 'reasoning': {
      if (runtimeSettings.showReasoningPanel && event.reasoningContent) {
        mutable.assistantReasoning += event.reasoningContent
        schedulePaint()
      }
      return true
    }

    case 'tool_call': {
      setStatus('executing_tools')
      if (event.toolCall) {
        const toolInfo = buildToolCallInfo({
          id: event.toolCall.id,
          name: event.toolCall.function.name,
          rawArguments: event.toolCall.function.arguments,
        })
        mutable.assistantToolCalls.push(toolInfo)
        setToolCalls((prev) => [...prev, toolInfo])
        void appendRunEvent({
          type: 'tool_call',
          toolCallId: toolInfo.id,
          toolName: toolInfo.name,
          args: toolInfo.args,
          status: toolInfo.status,
        })
        setMessages((prev) => {
          const existingIndex = prev.findIndex((m) => m.id === assistantMessageId)
          if (existingIndex >= 0) {
            const updated = [...prev]
            updated[existingIndex] = {
              ...updated[existingIndex],
              mode,
              toolCalls: mutable.assistantToolCalls,
            }
            return updated
          }
          return prev
        })
      }
      return true
    }

    case 'tool_result': {
      if (event.toolResult) {
        setToolCalls((prev) => applyToolResult(prev, event.toolResult!))
        mutable.assistantToolCalls = applyToolResult(mutable.assistantToolCalls, event.toolResult)
        setMessages((prev) => {
          const existingIndex = prev.findIndex((m) => m.id === assistantMessageId)
          if (existingIndex >= 0) {
            const updated = [...prev]
            updated[existingIndex] = {
              ...updated[existingIndex],
              toolCalls: mutable.assistantToolCalls,
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
      return true
    }

    case 'snapshot': {
      if (event.snapshot) {
        const step = buildSnapshotProgressStep({
          snapshot: event.snapshot,
          content: event.content,
        })
        setProgressSteps((prev) => [...prev, step].slice(-30))
        void appendRunEvent({
          type: 'snapshot',
          content: step.content,
          status: 'completed',
          snapshot: event.snapshot,
        })
      }
      return true
    }

    default:
      return false
  }
}
