'use client'

import { useCallback } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import type { ChatMode } from '@/lib/agent/prompt-library'

interface AgentLike {
  stop: () => void
  clear: () => void
  setInput: (value: string) => void
}

interface UseProjectWorkspaceActionsParams {
  projectId: Id<'projects'>
  chatMode: ChatMode
  createChat: (args: {
    projectId: Id<'projects'>
    title: string
    mode: ChatMode
  }) => Promise<Id<'chats'>>
  setActiveChatId: (chatId: Id<'chats'>) => void
  agent: AgentLike
  setPlanDraft: (value: string) => void
  setChatMode: (mode: ChatMode) => void
  notifyReset: () => void
}

export function useProjectWorkspaceActions({
  projectId,
  chatMode,
  createChat,
  setActiveChatId,
  agent,
  setPlanDraft,
  setChatMode,
  notifyReset,
}: UseProjectWorkspaceActionsParams) {
  const handleSelectChat = useCallback(
    (chatId: Id<'chats'>) => {
      setActiveChatId(chatId)
    },
    [setActiveChatId]
  )

  const handleNewChat = useCallback(async () => {
    const id = await createChat({ projectId, title: 'New Chat', mode: chatMode })
    setActiveChatId(id)
  }, [chatMode, createChat, projectId, setActiveChatId])

  const handleResetWorkspace = useCallback(() => {
    agent.stop()
    agent.clear()
    agent.setInput('')
    setPlanDraft('')
    setChatMode('plan')
    notifyReset()
  }, [agent, notifyReset, setChatMode, setPlanDraft])

  return {
    handleSelectChat,
    handleNewChat,
    handleResetWorkspace,
  }
}
