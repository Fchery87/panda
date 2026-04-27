'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useQuery, usePaginatedQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type {
  Message,
  MessageAnnotationInfo,
  LatestRunReceiptInfo,
  PersistedRunEventSummaryInfo,
  ToolCallInfo,
} from '@/components/chat/types'
import {
  mapLatestRunSummaryProgressSteps,
  type LiveProgressStep,
} from '@/components/chat/live-run-utils'
import type { ChatMode } from '@/lib/agent/prompt-library'
import { normalizeChatMode } from '@/lib/agent/prompt-library'
import { isRateLimitError, getUserFacingAgentError } from '@/lib/chat/error-messages'
import { logConvexPayload } from '@/lib/convex/payload-metrics'

interface ConvexMessage {
  _id: Id<'messages'>
  _creationTime: number
  chatId: Id<'chats'>
  role: 'user' | 'assistant' | 'system'
  content: string
  annotations?: MessageAnnotationInfo[]
  attachments?: Message['attachments']
  createdAt: number
}

interface AgentRunEventSummary extends PersistedRunEventSummaryInfo {
  _id: Id<'agentRunEvents'>
  runId: Id<'agentRuns'>
  sequence: number
  createdAt: number
}

type MobilePrimaryPanel = 'workspace' | 'chat' | 'review'

interface UseWorkbenchChatStateArgs {
  activeChat: {
    _id: Id<'chats'>
  } | null
  chatMode: ChatMode
  agent: {
    isLoading: boolean
    messages: Array<{
      id: string
      role: 'user' | 'assistant' | 'tool'
      content: string
      reasoningContent?: string
      mode: ChatMode
      createdAt: number
      toolCalls?: ToolCallInfo[]
      annotations?: MessageAnnotationInfo
    }>
    progressSteps: LiveProgressStep[]
    error: string | null
  }
  onPersistedMessagesChange?: (messages: Message[]) => void
  isMobileLayout: boolean
  mobilePrimaryPanel: MobilePrimaryPanel
  setMobileUnreadCount: React.Dispatch<React.SetStateAction<number>>
  _setIsRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>
  _setMobilePrimaryPanel: (panel: MobilePrimaryPanel) => void
  _setRightPanelTab: React.Dispatch<
    React.SetStateAction<'chat' | 'plan' | 'review' | 'inspect' | 'run' | 'comments'>
  >
}

export function useWorkbenchChatState({
  activeChat,
  chatMode,
  agent,
  onPersistedMessagesChange,
  isMobileLayout,
  mobilePrimaryPanel,
  setMobileUnreadCount,
  _setIsRightPanelOpen,
  _setMobilePrimaryPanel,
  _setRightPanelTab,
}: UseWorkbenchChatStateArgs) {
  const lastAssistantMessageIdRef = useRef<string | null>(null)
  const lastAgentMessagesRef = useRef<Message[]>([])
  const lastAgentMessagesChatIdRef = useRef<Id<'chats'> | null>(null)

  const convexMessagesPage = usePaginatedQuery(
    api.messages.listPaginatedLite,
    activeChat ? { chatId: activeChat._id } : 'skip',
    { initialNumItems: 50 }
  )
  const convexMessages = convexMessagesPage.results as ConvexMessage[] | undefined

  useEffect(() => {
    logConvexPayload('chat.messages.active', convexMessages)
  }, [convexMessages])

  const persistedChatMessages: Message[] = useMemo(
    () =>
      convexMessages
        ?.filter((msg) => !activeChat || msg.chatId === activeChat._id)
        .map((msg) => {
          const firstAnnotation = msg.annotations?.[0]
          return {
            _id: msg._id,
            role: msg.role,
            content: msg.content,
            reasoningContent: firstAnnotation?.reasoningSummary,
            attachments: msg.attachments,
            annotations: firstAnnotation
              ? {
                  ...firstAnnotation,
                  mode: normalizeChatMode(firstAnnotation.mode, chatMode),
                }
              : undefined,
            toolCalls: firstAnnotation?.toolCalls,
            createdAt: msg.createdAt,
          }
        }) || [],
    [activeChat, chatMode, convexMessages]
  )

  useEffect(() => {
    onPersistedMessagesChange?.(persistedChatMessages)
  }, [onPersistedMessagesChange, persistedChatMessages])

  const runEvents = useQuery(
    api.agentRuns.listEventSummariesByChat,
    activeChat ? { chatId: activeChat._id, limit: 60 } : 'skip'
  ) as AgentRunEventSummary[] | undefined

  const latestRunReceipt = useQuery(
    api.agentRuns.getLatestReceiptByChat,
    activeChat ? { chatId: activeChat._id } : 'skip'
  ) as LatestRunReceiptInfo | null | undefined

  useEffect(() => {
    logConvexPayload('chat.runEvents.summary', runEvents)
  }, [runEvents])

  useEffect(() => {
    logConvexPayload('chat.runReceipt.latest', latestRunReceipt)
  }, [latestRunReceipt])

  const chatMessages: Message[] = useMemo(() => {
    if (!activeChat) {
      lastAgentMessagesChatIdRef.current = null
      return persistedChatMessages
    }

    if (!agent.isLoading && agent.messages.length === 0 && persistedChatMessages.length) {
      lastAgentMessagesRef.current = []
      lastAgentMessagesChatIdRef.current = null
      return persistedChatMessages
    }

    const mapped = agent.messages
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => ({
        _id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        reasoningContent: msg.reasoningContent,
        toolCalls: msg.toolCalls,
        annotations: {
          ...(msg.annotations || {}),
          mode: msg.mode,
        },
        createdAt: msg.createdAt,
      }))

    if (mapped.length > 0) {
      lastAgentMessagesRef.current = mapped
      lastAgentMessagesChatIdRef.current = activeChat._id
      return mapped
    }

    if (
      lastAgentMessagesChatIdRef.current === activeChat._id &&
      lastAgentMessagesRef.current.length > 0 &&
      persistedChatMessages.length === 0
    ) {
      return lastAgentMessagesRef.current
    }

    return mapped
  }, [agent.isLoading, agent.messages, activeChat, persistedChatMessages])

  const replayProgressSteps = useMemo(
    () => mapLatestRunSummaryProgressSteps(runEvents ?? []).slice(-24),
    [runEvents]
  )

  const liveRunSteps = useMemo(() => {
    return agent.progressSteps.length > 0 ? agent.progressSteps : replayProgressSteps
  }, [agent.progressSteps, replayProgressSteps])

  const snapshotRunEvents = useMemo(
    () => (runEvents ?? []).filter((event) => event.type === 'snapshot'),
    [runEvents]
  )

  const subagentToolCalls = useMemo(
    () =>
      chatMessages
        .flatMap((message) => message.toolCalls ?? [])
        .filter((call) => call.name === 'task'),
    [chatMessages]
  )

  const latestUserPrompt = useMemo(
    () =>
      [...chatMessages]
        .reverse()
        .find((msg) => msg.role === 'user' && typeof msg.content === 'string' && msg.content.trim())
        ?.content ?? null,
    [chatMessages]
  )

  const latestAssistantReply = useMemo(
    () =>
      [...chatMessages]
        .reverse()
        .find(
          (msg) => msg.role === 'assistant' && typeof msg.content === 'string' && msg.content.trim()
        )?.content ?? null,
    [chatMessages]
  )

  const inlineRateLimitError = useMemo(() => {
    if (!agent.error || !isRateLimitError(agent.error)) return null
    return getUserFacingAgentError(agent.error)
  }, [agent.error])

  useEffect(() => {
    if (!isMobileLayout || mobilePrimaryPanel === 'chat') {
      setMobileUnreadCount(0)
    }
  }, [isMobileLayout, mobilePrimaryPanel, setMobileUnreadCount])

  useEffect(() => {
    const latestAssistant = [...chatMessages].reverse().find((msg) => msg.role === 'assistant')
    if (!latestAssistant) return

    if (!lastAssistantMessageIdRef.current) {
      lastAssistantMessageIdRef.current = latestAssistant._id
      return
    }

    if (latestAssistant._id !== lastAssistantMessageIdRef.current) {
      lastAssistantMessageIdRef.current = latestAssistant._id
      if (isMobileLayout && mobilePrimaryPanel === 'workspace') {
        setMobileUnreadCount((count) => Math.min(99, count + 1))
      }
    }
  }, [chatMessages, isMobileLayout, mobilePrimaryPanel, setMobileUnreadCount])

  return {
    convexMessages,
    runEvents,
    latestRunReceipt,
    chatMessages,
    liveRunSteps,
    snapshotRunEvents,
    subagentToolCalls,
    latestUserPrompt,
    latestAssistantReply,
    inlineRateLimitError,
  }
}
