'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import { toast } from 'sonner'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'

type MessageWorkflowChat = {
  _id: Id<'chats'>
  mode: ChatMode
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
  includeEditorContext?: boolean
  attachments?: UploadedAttachment[]
  attachmentsOnly?: boolean
  variantCount?: number
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
  approvedPlanArtifact?: GeneratedPlanArtifact | null
  activePlanningSessionId?: string | null
}): Pick<SendAgentMessageOptions, 'approvedPlanExecutionContext'> & { content: string } {
  const shouldExecuteApprovedPlan = Boolean(args.approvedPlanExecution)
  const artifact = args.approvedPlanArtifact

  if (!shouldExecuteApprovedPlan || !artifact) {
    return { content: args.content }
  }
  if (!isExecutablePlanArtifact(artifact)) {
    return { content: args.content }
  }

  const sessionId =
    args.activePlanningSessionId && artifact.sessionId === args.activePlanningSessionId
      ? args.activePlanningSessionId
      : (artifact.sessionId ?? args.activePlanningSessionId ?? '')

  return {
    content: args.content,
    approvedPlanExecutionContext: {
      sessionId,
      plan: artifact,
    },
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
  approvedPlanArtifact?: GeneratedPlanArtifact | null
  activePlanningSessionId?: string | null
  providerAvailable: boolean
  createChatMutation: (args: {
    projectId: Id<'projects'>
    title: string
    mode: ChatMode
  }) => Promise<Id<'chats'>>
  updateChatMutation: (args: { id: Id<'chats'>; mode?: ChatMode }) => Promise<unknown>
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
    approvedPlanArtifact,
    activePlanningSessionId,
    providerAvailable,
    createChatMutation,
    updateChatMutation,
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
    includeEditorContext?: boolean
    variantCount?: number
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
      includeEditorContext: pendingMessage.includeEditorContext,
      variantCount: pendingMessage.variantCount,
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
      const hasAttachmentsOnly = Boolean(options?.attachmentsOnly && options?.attachments?.length)
      if (!trimmed && !hasAttachmentsOnly) {
        toast.error('Message is empty')
        return
      }

      setChatMode(mode)
      setMobilePrimaryPanel('chat')

      const approvedPlanExecutionPayload =
        mode === 'build' || mode === 'code'
          ? buildApprovedPlanExecutionPayload({
              content: trimmed,
              approvedPlanExecution:
                options?.approvedPlanExecution || isExecutablePlanArtifact(approvedPlanArtifact),
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
                title: (trimmed || 'Attachments').slice(0, 50),
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
                    includeEditorContext: options?.includeEditorContext,
                    variantCount: options?.variantCount,
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

      if (!providerAvailable) {
        toast.error('LLM provider not configured', {
          description: 'Please configure your LLM settings in the settings page.',
        })
        return
      }

      await sendAgentMessage(finalContent, contextFiles, {
        approvedPlanExecution: options?.approvedPlanExecution,
        approvedPlanExecutionContext: approvedPlanExecutionPayload.approvedPlanExecutionContext,
        includeEditorContext: options?.includeEditorContext,
        variantCount: options?.variantCount,
        attachments: options?.attachments,
        attachmentsOnly: options?.attachmentsOnly,
      })
    },
    [
      activeChat,
      createChatMutation,
      approvedPlanArtifact,
      projectId,
      providerAvailable,
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
    if (!activePlanningSessionId || !isExecutablePlanArtifact(approvedPlanArtifact)) {
      toast.error('Approve the current plan before building')
      return
    }

    try {
      const shouldUseStructuredTransition = shouldUseStructuredExecutionTransition({
        activePlanningSessionId,
        approvedPlanArtifact,
        markPlanningExecutionState,
      })

      if (activePlanningSessionId && !shouldUseStructuredTransition) {
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
        throw new Error('Structured plan execution requires a planning session transition callback')
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
