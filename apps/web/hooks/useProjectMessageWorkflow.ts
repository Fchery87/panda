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

type ForgeStateRecord = {
  _id: Id<'deliveryStates'>
}

type ExecutablePlanArtifact = Pick<GeneratedPlanArtifact, 'status'>

type UploadedAttachment = {
  storageId: Id<'_storage'>
  kind: 'file' | 'image'
  filename: string
  contentType?: string
  size?: number
  contextFilePath?: string
  url?: string
}

type SendAgentMessageOptions = {
  approvedPlanExecution?: boolean
  approvedPlanExecutionContext?: {
    sessionId: string
    plan: GeneratedPlanArtifact
  }
  attachments?: UploadedAttachment[]
  attachmentsOnly?: boolean
}

export function shouldQueuePendingDirectSend(args: {
  workflowAction: MessageWorkflowAction
  providerAvailable: boolean
}): boolean {
  return args.workflowAction.type === 'create_chat_and_send_directly' && args.providerAvailable
}

export function buildApprovedPlanExecutionPayload(args: {
  content: string
  approvedPlanExecution?: boolean
  planDraft?: string
  approvedPlanArtifact?: GeneratedPlanArtifact | null
  activePlanningSessionId?: string | null
}): Pick<SendAgentMessageOptions, 'approvedPlanExecutionContext'> & { content: string } {
  const shouldExecuteApprovedPlan = Boolean(args.approvedPlanExecution)

  if (
    shouldExecuteApprovedPlan &&
    args.activePlanningSessionId &&
    args.approvedPlanArtifact &&
    args.approvedPlanArtifact.sessionId === args.activePlanningSessionId
  ) {
    return {
      content: args.content,
      approvedPlanExecutionContext: {
        sessionId: args.activePlanningSessionId,
        plan: args.approvedPlanArtifact,
      },
    }
  }

  return {
    content:
      shouldExecuteApprovedPlan && (args.approvedPlanArtifact || args.planDraft?.trim())
        ? buildApprovedPlanExecutionMessage(
            args.approvedPlanArtifact ?? args.planDraft ?? '',
            args.content
          )
        : args.content,
  }
}

type MessageWorkflowAction = { type: 'create_chat_and_send_directly' } | { type: 'send_directly' }

export function resolveMessageWorkflowAction(args: {
  hasActiveChat: boolean
  mode: ChatMode
  trimmedContent: string
  activePlanningSessionId?: string | null
}): MessageWorkflowAction {
  return args.hasActiveChat ? { type: 'send_directly' } : { type: 'create_chat_and_send_directly' }
}

export async function executeMessageWorkflowAction(args: {
  workflowAction: MessageWorkflowAction
  activeChatId?: Id<'chats'> | null
  createChat?: () => Promise<Id<'chats'>>
  onChatCreated?: (chatId: Id<'chats'>) => void
  queuePendingDirectSend?: () => void
}): Promise<boolean> {
  const { workflowAction, createChat, onChatCreated, queuePendingDirectSend } = args

  if (workflowAction.type === 'create_chat_and_send_directly') {
    if (!createChat) {
      throw new Error('Cannot create a chat for direct send without a createChat callback')
    }

    const chatId = await createChat()
    onChatCreated?.(chatId)
    queuePendingDirectSend?.()
    return true
  }

  return false
}

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

export function shouldUseStructuredExecutionTransition(args: {
  activePlanningSessionId?: string | null
  approvedPlanArtifact?: ExecutablePlanArtifact | null
  markPlanningExecutionState?: (args: { sessionId: string; state: 'executing' }) => Promise<unknown>
}): boolean {
  return Boolean(
    args.activePlanningSessionId &&
    isExecutablePlanArtifact(args.approvedPlanArtifact) &&
    args.markPlanningExecutionState
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
  startForgeIntake: (args: {
    projectId: Id<'projects'>
    chatId: Id<'chats'>
    title: string
    goal: string
    description?: string
    constraints?: string[]
  }) => Promise<Id<'deliveryStates'>>
  createForgeTasksFromPlan: (args: {
    deliveryStateId: Id<'deliveryStates'>
    tasks: Array<{
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
      testRequirements?: string[]
      reviewRequirements?: string[]
      qaRequirements?: string[]
    }>
  }) => Promise<Id<'deliveryTasks'>[]>
  acceptForgePlan: (args: {
    deliveryStateId: Id<'deliveryStates'>
    summary?: string
  }) => Promise<Id<'deliveryStates'>>
  getActiveForgeState?: (chatId: Id<'chats'>) => Promise<ForgeStateRecord | null>
  markPlanningExecutionState?: (args: { sessionId: string; state: 'executing' }) => Promise<unknown>
  sendAgentMessage: (
    content: string,
    contextFiles?: string[],
    options?: SendAgentMessageOptions
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
    startForgeIntake,
    createForgeTasksFromPlan,
    acceptForgePlan,
    getActiveForgeState,
    markPlanningExecutionState,
    sendAgentMessage,
    setActiveChatId,
    setMobilePrimaryPanel,
  } = args
  const [pendingMessage, setPendingMessage] = useState<{
    id: string
    content: string
    mode: ChatMode
    contextFiles?: string[]
    approvedPlanExecution?: boolean
    approvedPlanExecutionContext?: {
      sessionId: string
      plan: GeneratedPlanArtifact
    }
    attachments?: UploadedAttachment[]
    attachmentsOnly?: boolean
  } | null>(null)
  const pendingMessageDispatchRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pendingMessage || !activeChat || chatMode !== pendingMessage.mode) return
    if (pendingMessageDispatchRef.current === pendingMessage.id) return

    pendingMessageDispatchRef.current = pendingMessage.id
    void sendAgentMessage(pendingMessage.content, pendingMessage.contextFiles, {
      approvedPlanExecution: pendingMessage.approvedPlanExecution,
      approvedPlanExecutionContext: pendingMessage.approvedPlanExecutionContext,
      attachments: pendingMessage.attachments,
      attachmentsOnly: pendingMessage.attachmentsOnly,
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
      options?: SendAgentMessageOptions
    ) => {
      const trimmed = content.trim()
      if (!trimmed) {
        toast.error('Message is empty')
        return
      }

      setChatMode(mode)
      setMobilePrimaryPanel('chat')

      const approvedPlanExecutionPayload =
        mode === 'build'
          ? buildApprovedPlanExecutionPayload({
              content: trimmed,
              approvedPlanExecution:
                options?.approvedPlanExecution || activeChat?.planStatus === 'executing',
              planDraft,
              approvedPlanArtifact,
              activePlanningSessionId,
            })
          : { content }
      const finalContent = approvedPlanExecutionPayload.content
      const workflowAction = resolveMessageWorkflowAction({
        hasActiveChat: Boolean(activeChat),
        mode,
        trimmedContent: trimmed,
        activePlanningSessionId,
      })

      if (workflowAction.type === 'create_chat_and_send_directly' && !providerAvailable) {
        toast.error('LLM provider not configured', {
          description: 'Please configure your LLM settings in the settings page.',
        })
        return
      }

      if (!activeChat) {
        try {
          const handled = await executeMessageWorkflowAction({
            workflowAction,
            createChat: () =>
              createChatMutation({
                projectId,
                title: trimmed.slice(0, 50),
                mode,
              }),
            onChatCreated: (chatId) => {
              toast.success('Chat created')
              setActiveChatId(chatId)
            },
            queuePendingDirectSend: shouldQueuePendingDirectSend({
              workflowAction,
              providerAvailable,
            })
              ? () => {
                  setPendingMessage({
                    id: `pending-${Date.now()}`,
                    content: finalContent,
                    mode,
                    contextFiles,
                    approvedPlanExecution: options?.approvedPlanExecution,
                    approvedPlanExecutionContext:
                      approvedPlanExecutionPayload.approvedPlanExecutionContext,
                    attachments: options?.attachments,
                    attachmentsOnly: options?.attachmentsOnly,
                  })
                }
              : undefined,
          })
          if (handled) return
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
        await executeMessageWorkflowAction({
          workflowAction,
          activeChatId: activeChat._id,
        })
      ) {
        return
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
        const existingDeliveryState = getActiveForgeState
          ? await getActiveForgeState(activeChat._id)
          : null
        const deliveryStateId =
          existingDeliveryState?._id ??
          (await startForgeIntake({
            projectId,
            chatId: activeChat._id,
            title: taskSeed.title,
            goal: finalContent,
            description: taskSeed.description,
          }))

        await createForgeTasksFromPlan({
          deliveryStateId,
          tasks: [
            {
              taskKey: `task-${Date.now()}`,
              title: taskSeed.title,
              description: taskSeed.description,
              rationale: taskSeed.rationale,
              ownerRole: taskSeed.ownerRole,
              acceptanceCriteria: taskSeed.acceptanceCriteria,
              testRequirements: ['Run the scoped implementation checks for this task.'],
              reviewRequirements: ['Executive implementation review is required.'],
              qaRequirements: ['Browser QA is required for affected routes.'],
            },
          ],
        })

        await acceptForgePlan({
          deliveryStateId,
          summary: 'Structured delivery activated for active implementation work.',
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
        approvedPlanExecutionContext: approvedPlanExecutionPayload.approvedPlanExecutionContext,
        attachments: options?.attachments,
        attachmentsOnly: options?.attachmentsOnly,
      })
    },
    [
      activeChat,
      createChatMutation,
      approvedPlanArtifact,
      planDraft,
      projectId,
      providerAvailable,
      startForgeIntake,
      createForgeTasksFromPlan,
      acceptForgePlan,
      getActiveForgeState,
      activePlanningSessionId,
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
      const shouldUseStructuredTransition = shouldUseStructuredExecutionTransition({
        activePlanningSessionId,
        approvedPlanArtifact,
        markPlanningExecutionState,
      })

      if (activePlanningSessionId && canBuildFromArtifact && !shouldUseStructuredTransition) {
        throw new Error('Structured plan execution requires a planning session transition callback')
      }

      if (shouldUseStructuredTransition) {
        const transitionSessionId = activePlanningSessionId
        const transitionPlanningExecutionState = markPlanningExecutionState
        if (!transitionSessionId || !transitionPlanningExecutionState) {
          throw new Error(
            'Structured plan execution requires a planning session transition callback'
          )
        }

        await transitionPlanningExecutionState({
          sessionId: transitionSessionId,
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
