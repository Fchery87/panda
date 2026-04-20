'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import { toast } from 'sonner'
import {
  type AgentStatus,
  canApprovePlan,
  deriveNextPlanDraft,
  getNextPlanStatusAfterDraftChange,
  getNextPlanStatusAfterGeneration,
  type PlanStatus,
} from '@/lib/chat/planDraft'
import type { ChatMode } from '@/lib/agent/prompt-library'
import { serializeGeneratedPlanArtifact, type GeneratedPlanArtifact } from '@/lib/planning/types'

type ProjectPlanChat = {
  _id: Id<'chats'>
  planDraft?: string
  planStatus?: PlanStatus
  planUpdatedAt?: number
  planLastGeneratedAt?: number
}

type ProjectPlanMessage = {
  id: string
  role: 'user' | 'assistant' | 'tool'
  mode: ChatMode
  content: string
}

type ActivePlanningSession = {
  sessionId: string
  status?: string
  generatedPlan?: GeneratedPlanArtifact
} | null

export function getAuthoritativePlanDraftValue(args: {
  activeChat: ProjectPlanChat | null
  activePlanningSession: ActivePlanningSession
}): string {
  if (args.activePlanningSession?.generatedPlan) {
    return serializeGeneratedPlanArtifact(args.activePlanningSession.generatedPlan)
  }

  return args.activeChat?.planDraft ?? ''
}

export function shouldDerivePlanDraftFromArchitectMessages(args: {
  activeChat: ProjectPlanChat | null
  activePlanningSession: ActivePlanningSession
  currentPlanDraft: string
  lastSavedPlanDraft: string
}): boolean {
  if (args.activePlanningSession?.sessionId || args.activePlanningSession?.generatedPlan) {
    return false
  }

  const persistedDraft = args.activeChat?.planDraft?.trim() ?? ''
  if (persistedDraft) {
    return false
  }

  const currentDraft = args.currentPlanDraft.trim()
  const lastSavedDraft = args.lastSavedPlanDraft.trim()
  return !currentDraft && !lastSavedDraft
}

export function shouldSyncStructuredPlanDraftMirror(args: {
  activeChat: ProjectPlanChat | null
  activePlanningSession: ActivePlanningSession
  authoritativePlanDraft: string
}): boolean {
  if (!args.activeChat?._id) return false
  if (!args.activePlanningSession?.generatedPlan) return false

  return (args.activeChat.planDraft?.trim() ?? '') !== args.authoritativePlanDraft.trim()
}

export function shouldUseStructuredPlanApproval(args: {
  activePlanningSession: ActivePlanningSession
  acceptPlanningSession?: () => Promise<unknown>
}): boolean {
  return Boolean(
    args.activePlanningSession?.sessionId &&
    args.activePlanningSession.generatedPlan?.status === 'ready_for_review' &&
    args.acceptPlanningSession
  )
}

export async function persistProjectPlanDraft(args: {
  activeChat: ProjectPlanChat | null
  nextPlanDraft: string
  updateChatMutation: (args: {
    id: Id<'chats'>
    planDraft?: string
    planStatus?: PlanStatus
    planLastGeneratedAt?: number
    planSourceMessageId?: string
    planApprovedAt?: number
  }) => Promise<unknown>
  lastSavedPlanDraft: string
  options?: {
    source?: 'manual' | 'generation'
    planSourceMessageId?: string
    forceSync?: boolean
  }
}): Promise<{ didPersist: boolean; nextLastSavedPlanDraft: string }> {
  const chatId = args.activeChat?._id
  if (!chatId) {
    return {
      didPersist: false,
      nextLastSavedPlanDraft: args.lastSavedPlanDraft,
    }
  }

  const trimmed = args.nextPlanDraft.trim()
  const lastSaved = args.lastSavedPlanDraft.trim()
  if (!args.options?.forceSync && trimmed === lastSaved) {
    return {
      didPersist: false,
      nextLastSavedPlanDraft: args.lastSavedPlanDraft,
    }
  }

  const source = args.options?.source ?? 'manual'
  const planStatus =
    source === 'generation'
      ? (getNextPlanStatusAfterGeneration({
          previousDraft: args.lastSavedPlanDraft,
          nextDraft: args.nextPlanDraft,
          currentStatus: args.activeChat?.planStatus,
        }) ?? (trimmed ? 'awaiting_review' : 'idle'))
      : getNextPlanStatusAfterDraftChange({
          previousDraft: args.lastSavedPlanDraft,
          nextDraft: args.nextPlanDraft,
          currentStatus: args.activeChat?.planStatus,
        })

  await args.updateChatMutation({
    id: chatId,
    planDraft: args.nextPlanDraft,
    planStatus,
    ...(source === 'generation' ? { planLastGeneratedAt: Date.now() } : {}),
    ...(source === 'generation' && args.options?.planSourceMessageId
      ? { planSourceMessageId: args.options.planSourceMessageId }
      : {}),
  })

  return {
    didPersist: true,
    nextLastSavedPlanDraft: args.nextPlanDraft,
  }
}

export function useProjectPlanDraft(args: {
  activeChat: ProjectPlanChat | null
  activePlanningSession: ActivePlanningSession
  chatMode: ChatMode
  architectBrainstormEnabled: boolean
  agentStatus: AgentStatus
  agentMessages: ProjectPlanMessage[]
  updateChatMutation: (args: {
    id: Id<'chats'>
    planDraft?: string
    planStatus?: PlanStatus
    planLastGeneratedAt?: number
    planSourceMessageId?: string
    planApprovedAt?: number
  }) => Promise<unknown>
  acceptPlanningSession?: () => Promise<unknown>
}) {
  const {
    activeChat,
    activePlanningSession,
    chatMode,
    architectBrainstormEnabled,
    agentStatus,
    agentMessages,
    updateChatMutation,
    acceptPlanningSession,
  } = args
  const [planDraft, setPlanDraft] = useState('')
  const [isSavingPlanDraft, setIsSavingPlanDraft] = useState(false)
  const lastSavedPlanDraftRef = useRef<string>('')
  const planSaveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const nextPlanDraft = getAuthoritativePlanDraftValue({
      activeChat,
      activePlanningSession,
    })
    setPlanDraft(nextPlanDraft)
    lastSavedPlanDraftRef.current = nextPlanDraft
  }, [activeChat, activePlanningSession])

  const persistPlanDraft = useCallback(
    async (
      nextPlanDraft: string,
      options?: {
        source?: 'manual' | 'generation'
        planSourceMessageId?: string
        forceSync?: boolean
      }
    ) => {
      try {
        const result = await persistProjectPlanDraft({
          activeChat,
          nextPlanDraft,
          updateChatMutation,
          lastSavedPlanDraft: lastSavedPlanDraftRef.current,
          options,
        })
        if (result.didPersist) {
          lastSavedPlanDraftRef.current = result.nextLastSavedPlanDraft
        }
      } catch (error) {
        toast.error('Failed to save plan draft', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [activeChat, updateChatMutation]
  )

  useEffect(() => {
    if (
      !shouldSyncStructuredPlanDraftMirror({
        activeChat,
        activePlanningSession,
        authoritativePlanDraft: planDraft,
      })
    ) {
      return
    }

    void persistPlanDraft(planDraft, { source: 'generation', forceSync: true })
  }, [activeChat, activePlanningSession, persistPlanDraft, planDraft])

  const handleSavePlanDraft = useCallback(async () => {
    setIsSavingPlanDraft(true)
    try {
      await persistPlanDraft(planDraft, { source: 'manual' })
    } finally {
      setIsSavingPlanDraft(false)
    }
  }, [persistPlanDraft, planDraft])

  const handleApprovePlan = useCallback(async () => {
    const canApproveStructuredPlan =
      activePlanningSession?.generatedPlan?.status === 'ready_for_review'
    const canApproveLegacyPlan = canApprovePlan(activeChat?.planStatus, planDraft)
    if (!activeChat || (!canApproveStructuredPlan && !canApproveLegacyPlan)) return

    const shouldUseStructuredApproval = shouldUseStructuredPlanApproval({
      activePlanningSession,
      acceptPlanningSession,
    })

    try {
      if (shouldUseStructuredApproval) {
        const approvePlanningSession = acceptPlanningSession
        if (!approvePlanningSession) {
          throw new Error('Structured plan approval requires a planning session accept callback')
        }

        await approvePlanningSession()
      } else if (canApproveStructuredPlan) {
        throw new Error('Structured plan approval requires a planning session accept callback')
      } else {
        await updateChatMutation({
          id: activeChat._id,
          planStatus: 'approved',
          planApprovedAt: Date.now(),
        })
      }
      toast.success('Plan approved')
    } catch (error) {
      toast.error('Failed to approve plan', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [acceptPlanningSession, activeChat, activePlanningSession, planDraft, updateChatMutation])

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

  useEffect(() => {
    if (
      !shouldDerivePlanDraftFromArchitectMessages({
        activeChat,
        activePlanningSession,
        currentPlanDraft: planDraft,
        lastSavedPlanDraft: lastSavedPlanDraftRef.current,
      })
    ) {
      return
    }

    const next = deriveNextPlanDraft({
      mode: chatMode,
      agentStatus,
      currentPlanDraft: planDraft,
      requireValidatedBrainstorm: architectBrainstormEnabled,
      messages: agentMessages
        .filter(
          (
            message
          ): message is ProjectPlanMessage & {
            role: 'user' | 'assistant'
          } => message.role === 'user' || message.role === 'assistant'
        )
        .map((message) => ({
          role: message.role,
          mode: message.mode,
          content: message.content,
        })),
    })
    if (!next) return
    if (planDraft.trim() !== lastSavedPlanDraftRef.current.trim()) return

    setPlanDraft(next)
    if (planSaveTimerRef.current !== null) {
      window.clearTimeout(planSaveTimerRef.current)
      planSaveTimerRef.current = null
    }
    const latestArchitectMessage = [...agentMessages]
      .reverse()
      .find(
        (message) =>
          message.role === 'assistant' && message.mode === 'plan' && message.content.trim()
      )
    void persistPlanDraft(next, {
      source: 'generation',
      planSourceMessageId: latestArchitectMessage?.id,
    })
  }, [
    activeChat,
    activePlanningSession,
    agentMessages,
    agentStatus,
    architectBrainstormEnabled,
    chatMode,
    persistPlanDraft,
    planDraft,
  ])

  return {
    planDraft,
    setPlanDraft,
    isSavingPlanDraft,
    handleSavePlanDraft,
    handleApprovePlan,
  }
}
