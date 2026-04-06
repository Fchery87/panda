'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import { toast } from 'sonner'
import {
  buildApprovedPlanExecutionMessage,
  canBuildFromPlan,
  type PlanStatus,
} from '@/lib/chat/planDraft'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'
import {
  deriveDeliveryTaskSeed,
  shouldActivateStructuredDelivery,
} from '@/lib/agent/delivery/manager'

type MessageWorkflowChat = {
  _id: Id<'chats'>
  mode: ChatMode
  planStatus?: PlanStatus
}

type DeliveryStateRecord = {
  _id: Id<'deliveryStates'>
}

type ExecutablePlanArtifact = Pick<GeneratedPlanArtifact, 'status'>

export function isExecutablePlanArtifact(
  artifact: ExecutablePlanArtifact | null | undefined
): boolean {
  if (!artifact) return false
  return (
    artifact.status === 'accepted' ||
    artifact.status === 'executing' ||
    artifact.status === 'failed' ||
    artifact.status === 'completed'
  )
}

export function useProjectMessageWorkflow(args: {
  projectId: Id<'projects'>
  activeChat: MessageWorkflowChat | null
  chatMode: ChatMode
  setChatMode: (mode: ChatMode) => void
  planDraft: string
  approvedPlanArtifact?: GeneratedPlanArtifact | null
  activePlanningSessionId?: string | null
  providerAvailable: boolean
  createChatMutation: (args: {
    projectId: Id<'projects'>
    title: string
    mode: ChatMode
  }) => Promise<Id<'chats'>>
  updateChatMutation: (args: {
    id: Id<'chats'>
    mode?: ChatMode
    planStatus?: PlanStatus
  }) => Promise<unknown>
  createDeliveryStateMutation: (args: {
    projectId: Id<'projects'>
    chatId: Id<'chats'>
    title: string
    goal: string
    description?: string
    constraints?: string[]
  }) => Promise<Id<'deliveryStates'>>
  createDeliveryTaskMutation: (args: {
    deliveryStateId: Id<'deliveryStates'>
    taskKey: string
    title: string
    description: string
    rationale: string
    ownerRole: 'manager'
    acceptanceCriteria: Array<{
      id: string
      text: string
      status: 'pending'
      verificationMethod: 'review'
    }>
    status: 'in_progress'
  }) => Promise<Id<'deliveryTasks'>>
  updateDeliveryStateSummaryMutation: (args: {
    id: Id<'deliveryStates'>
    activeTaskTitle?: string
    currentPhaseSummary?: string
  }) => Promise<unknown>
  getActiveDeliveryState?: (chatId: Id<'chats'>) => Promise<DeliveryStateRecord | null>
  markPlanningExecutionState?: (args: { sessionId: string; state: 'executing' }) => Promise<unknown>
  sendAgentMessage: (
    content: string,
    contextFiles?: string[],
    options?: { approvedPlanExecution?: boolean }
  ) => Promise<void>
  setActiveChatId: (chatId: Id<'chats'>) => void
  setMobilePrimaryPanel: (panel: 'workspace' | 'chat') => void
}) {
  const {
    projectId,
    activeChat,
    chatMode,
    setChatMode,
    planDraft,
    approvedPlanArtifact,
    activePlanningSessionId,
    providerAvailable,
    createChatMutation,
    updateChatMutation,
    createDeliveryStateMutation,
    createDeliveryTaskMutation,
    updateDeliveryStateSummaryMutation,
    getActiveDeliveryState,
    markPlanningExecutionState,
    sendAgentMessage,
    setActiveChatId,
    setMobilePrimaryPanel,
  } = args
  const [pendingMessage, setPendingMessage] = useState<{
    id: string
    content: string
    mode: ChatMode
    approvedPlanExecution?: boolean
  } | null>(null)
  const pendingMessageDispatchRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pendingMessage || !activeChat || chatMode !== pendingMessage.mode) return
    if (pendingMessageDispatchRef.current === pendingMessage.id) return

    pendingMessageDispatchRef.current = pendingMessage.id
    void sendAgentMessage(pendingMessage.content, undefined, {
      approvedPlanExecution: pendingMessage.approvedPlanExecution,
    }).finally(() => {
      setPendingMessage((current) => (current?.id === pendingMessage.id ? null : current))
      if (pendingMessageDispatchRef.current === pendingMessage.id) {
        pendingMessageDispatchRef.current = null
      }
    })
  }, [activeChat, chatMode, pendingMessage, sendAgentMessage])

  const handleSendMessage = useCallback(
    async (
      content: string,
      mode: ChatMode,
      contextFiles?: string[],
      options?: { approvedPlanExecution?: boolean }
    ) => {
      const trimmed = content.trim()
      if (!trimmed) {
        toast.error('Message is empty')
        return
      }

      setChatMode(mode)
      setMobilePrimaryPanel('chat')

      const finalContent =
        mode === 'build' &&
        (approvedPlanArtifact || planDraft.trim()) &&
        (options?.approvedPlanExecution || activeChat?.planStatus === 'executing')
          ? buildApprovedPlanExecutionMessage(approvedPlanArtifact ?? planDraft, trimmed)
          : content

      if (!activeChat) {
        try {
          const newChatId = await createChatMutation({
            projectId,
            title: trimmed.slice(0, 50),
            mode,
          })
          toast.success('Chat created')
          setActiveChatId(newChatId)
          setPendingMessage({
            id: `pending-${Date.now()}`,
            content: finalContent,
            mode,
            approvedPlanExecution: options?.approvedPlanExecution,
          })
        } catch (error) {
          void error
          toast.error('Failed to create chat')
        }
        return
      }

      if (activeChat.mode !== mode) {
        await updateChatMutation({ id: activeChat._id, mode })
      }

      if (
        shouldActivateStructuredDelivery({
          mode,
          content: finalContent,
          approvedPlanExecution: options?.approvedPlanExecution,
        })
      ) {
        const taskSeed = deriveDeliveryTaskSeed({
          mode,
          content: finalContent,
          approvedPlanExecution: options?.approvedPlanExecution,
        })
        const existingDeliveryState = getActiveDeliveryState
          ? await getActiveDeliveryState(activeChat._id)
          : null
        const deliveryStateId =
          existingDeliveryState?._id ??
          (await createDeliveryStateMutation({
            projectId,
            chatId: activeChat._id,
            title: taskSeed.title,
            goal: finalContent,
            description: taskSeed.description,
          }))

        await createDeliveryTaskMutation({
          deliveryStateId,
          taskKey: `task-${Date.now()}`,
          title: taskSeed.title,
          description: taskSeed.description,
          rationale: taskSeed.rationale,
          ownerRole: taskSeed.ownerRole,
          acceptanceCriteria: taskSeed.acceptanceCriteria,
          status: taskSeed.status,
        })

        await updateDeliveryStateSummaryMutation({
          id: deliveryStateId,
          activeTaskTitle: taskSeed.title,
          currentPhaseSummary: 'Structured delivery activated for active implementation work.',
        })
      }

      if (!providerAvailable) {
        toast.error('LLM provider not configured', {
          description: 'Please configure your LLM settings in the settings page.',
        })
        return
      }

      await sendAgentMessage(finalContent, contextFiles, {
        approvedPlanExecution: options?.approvedPlanExecution,
      })
    },
    [
      activeChat,
      createChatMutation,
      approvedPlanArtifact,
      planDraft,
      projectId,
      providerAvailable,
      createDeliveryStateMutation,
      createDeliveryTaskMutation,
      updateDeliveryStateSummaryMutation,
      getActiveDeliveryState,
      sendAgentMessage,
      setActiveChatId,
      setChatMode,
      setMobilePrimaryPanel,
      updateChatMutation,
    ]
  )

  const handleSuggestedAction = useCallback(
    async (prompt: string, targetMode?: ChatMode) => {
      const mode = targetMode ?? chatMode
      if (targetMode) {
        if (activeChat && activeChat.mode !== targetMode) {
          void updateChatMutation({ id: activeChat._id, mode: targetMode })
        }
        setChatMode(targetMode)
      }
      await handleSendMessage(prompt, mode)
    },
    [activeChat, chatMode, handleSendMessage, setChatMode, updateChatMutation]
  )

  const handleBuildFromPlan = useCallback(async () => {
    if (!activeChat) return
    const canBuildFromArtifact = isExecutablePlanArtifact(approvedPlanArtifact)
    const canBuildFromLegacyDraft = canBuildFromPlan(activeChat.planStatus, planDraft)
    if (!canBuildFromArtifact && !canBuildFromLegacyDraft) {
      toast.error('Approve the current plan before building')
      return
    }

    try {
      if (activePlanningSessionId && canBuildFromArtifact && markPlanningExecutionState) {
        await markPlanningExecutionState({
          sessionId: activePlanningSessionId,
          state: 'executing',
        })
        if (activeChat.mode !== 'build') {
          await updateChatMutation({
            id: activeChat._id,
            mode: 'build',
          })
        }
      } else {
        await updateChatMutation({
          id: activeChat._id,
          mode: 'build',
          planStatus: 'executing',
        })
      }
      setChatMode('build')
      await handleSendMessage(
        'Execute the approved plan. Use the plan as the primary contract, follow it step-by-step, and report progress against it.',
        'build',
        undefined,
        { approvedPlanExecution: true }
      )
    } catch (error) {
      toast.error('Failed to start build from plan', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [
    activeChat,
    activePlanningSessionId,
    approvedPlanArtifact,
    planDraft,
    setChatMode,
    updateChatMutation,
    markPlanningExecutionState,
    handleSendMessage,
  ])

  const handleModeChange = useCallback(
    (nextMode: ChatMode) => {
      setChatMode(nextMode)
      if (activeChat && activeChat.mode !== nextMode) {
        void updateChatMutation({ id: activeChat._id, mode: nextMode })
      }
    },
    [activeChat, setChatMode, updateChatMutation]
  )

  return {
    handleSendMessage,
    handleSuggestedAction,
    handleBuildFromPlan,
    handleModeChange,
  }
}
