'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useQuery, usePaginatedQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type {
  Message,
  MessageAnnotationInfo,
  PersistedRunEventInfo,
  ToolCallInfo,
} from '@/components/chat/types'
import { mapLatestRunProgressSteps, type LiveProgressStep } from '@/components/chat/live-run-utils'
import type { InspectorTab } from '@/components/projects/ProjectChatInspector'
import type { ChatMode } from '@/lib/agent/prompt-library'
import { normalizeChatMode } from '@/lib/agent/prompt-library'
import { isRateLimitError, getUserFacingAgentError } from '@/lib/chat/error-messages'

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

interface AgentRunEvent extends PersistedRunEventInfo {
  _id: Id<'agentRunEvents'>
  _creationTime: number
  runId: Id<'agentRuns'>
  sequence: number
  createdAt: number
}

type MobilePrimaryPanel = 'workspace' | 'chat' | 'review'
type ChatInspectorTab =
  | 'run'
  | 'plan'
  | 'artifacts'
  | 'memory'
  | 'evals'
  | 'tasks'
  | 'qa'
  | 'state'
  | 'browser'
  | 'activity'
  | 'decisions'
type RightPanelTab = 'chat' | 'plan' | 'review' | 'inspect' | 'run' | 'comments'

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
  isMobileLayout: boolean
  mobilePrimaryPanel: MobilePrimaryPanel
  chatInspectorTab: ChatInspectorTab
  setMobileUnreadCount: React.Dispatch<React.SetStateAction<number>>
  setIsChatInspectorOpen: (open: boolean) => void
  setChatInspectorTab: React.Dispatch<React.SetStateAction<ChatInspectorTab>>
  setIsRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>
  setMobilePrimaryPanel: (panel: MobilePrimaryPanel) => void
  setRightPanelTab: React.Dispatch<React.SetStateAction<RightPanelTab>>
}

export function useWorkbenchChatState({
  activeChat,
  chatMode,
  agent,
  isMobileLayout,
  mobilePrimaryPanel,
  chatInspectorTab,
  setMobileUnreadCount,
  setIsChatInspectorOpen,
  setChatInspectorTab,
  setIsRightPanelOpen,
  setMobilePrimaryPanel,
  setRightPanelTab,
}: UseWorkbenchChatStateArgs) {
  const lastAssistantMessageIdRef = useRef<string | null>(null)
  const lastAgentMessagesRef = useRef<Message[]>([])

  const convexMessagesPage = usePaginatedQuery(
    api.messages.listPaginated,
    activeChat ? { chatId: activeChat._id } : 'skip',
    { initialNumItems: 100 }
  )
  const convexMessages = convexMessagesPage.results as ConvexMessage[] | undefined

  const runEvents = useQuery(
    api.agentRuns.listEventsByChat,
    activeChat ? { chatId: activeChat._id, limit: 120 } : 'skip'
  ) as AgentRunEvent[] | undefined

  const chatMessages: Message[] = useMemo(() => {
    const mapConvexMessages = (source: ConvexMessage[] | undefined) =>
      source?.map((msg) => {
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
      }) || []

    if (!activeChat) {
      return mapConvexMessages(convexMessages)
    }

    if (!agent.isLoading && agent.messages.length === 0 && convexMessages?.length) {
      lastAgentMessagesRef.current = []
      return mapConvexMessages(convexMessages)
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
      return mapped
    }

    if (lastAgentMessagesRef.current.length > 0 && !convexMessages?.length) {
      return lastAgentMessagesRef.current
    }

    return mapped
  }, [agent.isLoading, agent.messages, activeChat, chatMode, convexMessages])

  const replayProgressSteps = useMemo(
    () => mapLatestRunProgressSteps(runEvents ?? []).slice(-24),
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

  const chatInspectorSurfaceTab: InspectorTab = useMemo(() => {
    if (
      chatInspectorTab === 'run' ||
      chatInspectorTab === 'plan' ||
      chatInspectorTab === 'artifacts' ||
      chatInspectorTab === 'memory' ||
      chatInspectorTab === 'evals'
    ) {
      return chatInspectorTab
    }

    return 'run'
  }, [chatInspectorTab])

  const openChatInspectorSurface = useCallback(
    (tab: InspectorTab) => {
      setRightPanelTab('chat')
      setIsRightPanelOpen(true)
      setIsChatInspectorOpen(true)
      setChatInspectorTab(tab)
      if (isMobileLayout) {
        setMobilePrimaryPanel('chat')
      }
    },
    [
      isMobileLayout,
      setChatInspectorTab,
      setIsChatInspectorOpen,
      setIsRightPanelOpen,
      setMobilePrimaryPanel,
      setRightPanelTab,
    ]
  )

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
    chatMessages,
    liveRunSteps,
    snapshotRunEvents,
    subagentToolCalls,
    latestUserPrompt,
    latestAssistantReply,
    inlineRateLimitError,
    chatInspectorSurfaceTab,
    openChatInspectorSurface,
  }
}
