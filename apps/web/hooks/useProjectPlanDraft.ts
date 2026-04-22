'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import { toast } from 'sonner'
import { type AgentStatus, deriveNextPlanDraft } from '@/lib/chat/planDraft'
import type { ChatMode } from '@/lib/agent/prompt-library'
import { serializeGeneratedPlanArtifact, type GeneratedPlanArtifact } from '@/lib/planning/types'

type ProjectPlanChat = {
  _id: Id<'chats'>
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
  activePlanningSession: ActivePlanningSession
}): string {
  if (args.activePlanningSession?.generatedPlan) {
    return serializeGeneratedPlanArtifact(args.activePlanningSession.generatedPlan)
  }

  return ''
}

export function shouldDerivePlanDraftFromArchitectMessages(args: {
  activeChat: ProjectPlanChat | null
  activePlanningSession: ActivePlanningSession
  currentPlanDraft: string
  lastSavedPlanDraft: string
}): boolean {
  if (!args.activeChat?._id) {
    return false
  }

  if (args.activePlanningSession?.sessionId || args.activePlanningSession?.generatedPlan) {
    return false
  }

  const currentDraft = args.currentPlanDraft.trim()
  const lastSavedDraft = args.lastSavedPlanDraft.trim()
  return !currentDraft && !lastSavedDraft
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

export function useProjectPlanDraft(args: {
  activeChat: ProjectPlanChat | null
  activePlanningSession: ActivePlanningSession
  chatMode: ChatMode
  architectBrainstormEnabled: boolean
  agentStatus: AgentStatus
  agentMessages: ProjectPlanMessage[]
  acceptPlanningSession?: () => Promise<unknown>
}) {
  const {
    activeChat,
    activePlanningSession,
    chatMode,
    architectBrainstormEnabled,
    agentStatus,
    agentMessages,
    acceptPlanningSession,
  } = args
  const [planDraft, setPlanDraft] = useState('')
  const isSavingPlanDraft = false
  const lastSavedPlanDraftRef = useRef<string>('')

  useEffect(() => {
    const nextPlanDraft = getAuthoritativePlanDraftValue({
      activePlanningSession,
    })
    setPlanDraft(nextPlanDraft)
    lastSavedPlanDraftRef.current = nextPlanDraft
  }, [activePlanningSession])

  const handleSavePlanDraft = useCallback(() => {
    lastSavedPlanDraftRef.current = planDraft
  }, [planDraft])

  const handleApprovePlan = useCallback(async () => {
    const canApproveStructuredPlan =
      activePlanningSession?.generatedPlan?.status === 'ready_for_review'
    if (!canApproveStructuredPlan) return

    const shouldUseStructuredApproval = shouldUseStructuredPlanApproval({
      activePlanningSession,
      acceptPlanningSession,
    })

    try {
      if (!shouldUseStructuredApproval) {
        throw new Error('Structured plan approval requires a planning session accept callback')
      }

      const approvePlanningSession = acceptPlanningSession
      if (!approvePlanningSession) {
        throw new Error('Structured plan approval requires a planning session accept callback')
      }

      await approvePlanningSession()
      toast.success('Plan approved')
    } catch (error) {
      toast.error('Failed to approve plan', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [acceptPlanningSession, activePlanningSession])

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

    const nextPlanDraft = deriveNextPlanDraft({
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
    if (!nextPlanDraft) return

    setPlanDraft(nextPlanDraft)
    lastSavedPlanDraftRef.current = nextPlanDraft
  }, [
    activeChat,
    activePlanningSession,
    agentMessages,
    agentStatus,
    architectBrainstormEnabled,
    chatMode,
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
