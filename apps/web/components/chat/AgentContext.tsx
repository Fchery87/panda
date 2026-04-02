/**
 * AgentContext - React Context for agent runtime state
 *
 * Eliminates prop drilling for agent-related state throughout the chat panel.
 * Provides centralized access to agent status, messages, and controls.
 */

'use client'

import { createContext, useContext, useCallback, useState, type ReactNode } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { Message } from '@/components/chat/types'

interface ProgressStep {
  id: string
  content: string
  status: 'pending' | 'active' | 'completed' | 'failed'
  timestamp?: number
}

interface AgentState {
  messages: Message[]
  isLoading: boolean
  error: Error | null
  progressSteps: ProgressStep[]
}

interface AgentContextValue {
  // State
  state: AgentState
  chatId: Id<'chats'> | null
  projectId: Id<'projects'>
  chatMode: ChatMode

  // Actions
  sendMessage: (content: string, options?: { mode?: ChatMode }) => void
  stop: () => void
  setMode: (mode: ChatMode) => void
}

const AgentContext = createContext<AgentContextValue | null>(null)

interface AgentProviderProps {
  children: ReactNode
  projectId: Id<'projects'>
  chatId?: Id<'chats'> | null
  initialMode?: ChatMode
}

export function AgentProvider({
  children,
  projectId,
  chatId = null,
  initialMode = 'code',
}: AgentProviderProps) {
  const [chatMode, setChatMode] = useState<ChatMode>(initialMode)
  const [state] = useState<AgentState>({
    messages: [],
    isLoading: false,
    error: null,
    progressSteps: [],
  })

  const sendMessage = useCallback(
    (content: string, options?: { mode?: ChatMode }) => {
      const targetMode = options?.mode || chatMode
      console.log('[AgentContext] Sending message:', {
        content,
        mode: targetMode,
        projectId,
        chatId,
      })
      // This will be connected to the actual agent runtime
    },
    [chatMode, projectId, chatId]
  )

  const stop = useCallback(() => {
    console.log('[AgentContext] Stopping agent')
    // This will be connected to the actual agent runtime
  }, [])

  const setMode = useCallback((mode: ChatMode) => {
    setChatMode(mode)
  }, [])

  const value: AgentContextValue = {
    state,
    chatId,
    projectId,
    chatMode,
    sendMessage,
    stop,
    setMode,
  }

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
}

export function useAgentContext(): AgentContextValue {
  const context = useContext(AgentContext)
  if (!context) {
    throw new Error('useAgentContext must be used within an AgentProvider')
  }
  return context
}

export function useAgent(): AgentState {
  return useAgentContext().state
}

export function useChatMode(): ChatMode {
  return useAgentContext().chatMode
}
