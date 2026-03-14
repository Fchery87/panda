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

export function useProjectPlanDraft(args: {
  activeChat: ProjectPlanChat | null
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
}) {
  const {
    activeChat,
    chatMode,
    architectBrainstormEnabled,
    agentStatus,
    agentMessages,
    updateChatMutation,
  } = args
  const [planDraft, setPlanDraft] = useState('')
  const [isSavingPlanDraft, setIsSavingPlanDraft] = useState(false)
  const lastSavedPlanDraftRef = useRef<string>('')
  const planSaveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const nextPlanDraft = activeChat?.planDraft ?? ''
    setPlanDraft(nextPlanDraft)
    lastSavedPlanDraftRef.current = nextPlanDraft
  }, [activeChat?._id, activeChat?.planDraft])

  const persistPlanDraft = useCallback(
    async (
      nextPlanDraft: string,
      options?: { source?: 'manual' | 'generation'; planSourceMessageId?: string }
    ) => {
      const chatId = activeChat?._id
      if (!chatId) return

      const trimmed = nextPlanDraft.trim()
      const lastSaved = lastSavedPlanDraftRef.current.trim()
      if (trimmed === lastSaved) return

      const source = options?.source ?? 'manual'
      const planStatus =
        source === 'generation'
          ? (getNextPlanStatusAfterGeneration({
              previousDraft: lastSavedPlanDraftRef.current,
              nextDraft: nextPlanDraft,
              currentStatus: activeChat?.planStatus,
            }) ?? (trimmed ? 'awaiting_review' : 'idle'))
          : getNextPlanStatusAfterDraftChange({
              previousDraft: lastSavedPlanDraftRef.current,
              nextDraft: nextPlanDraft,
              currentStatus: activeChat?.planStatus,
            })

      try {
        await updateChatMutation({
          id: chatId,
          planDraft: nextPlanDraft,
          planStatus,
          ...(source === 'generation' ? { planLastGeneratedAt: Date.now() } : {}),
          ...(source === 'generation' && options?.planSourceMessageId
            ? { planSourceMessageId: options.planSourceMessageId }
            : {}),
        })
        lastSavedPlanDraftRef.current = nextPlanDraft
      } catch (error) {
        toast.error('Failed to save plan draft', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [activeChat?._id, activeChat?.planStatus, updateChatMutation]
  )

  const handleSavePlanDraft = useCallback(async () => {
    setIsSavingPlanDraft(true)
    try {
      await persistPlanDraft(planDraft, { source: 'manual' })
    } finally {
      setIsSavingPlanDraft(false)
    }
  }, [persistPlanDraft, planDraft])

  const handleApprovePlan = useCallback(async () => {
    if (!activeChat || !canApprovePlan(activeChat.planStatus, planDraft)) return

    try {
      await updateChatMutation({
        id: activeChat._id,
        planStatus: 'approved',
        planApprovedAt: Date.now(),
      })
      toast.success('Plan approved')
    } catch (error) {
      toast.error('Failed to approve plan', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [activeChat, planDraft, updateChatMutation])

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
          message.role === 'assistant' && message.mode === 'architect' && message.content.trim()
      )
    void persistPlanDraft(next, {
      source: 'generation',
      planSourceMessageId: latestArchitectMessage?.id,
    })
  }, [
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
