'use client'

import { createContext, useContext, type ReactNode } from 'react'

type AgentRuntimeActions = {
  approvePlan?: () => Promise<void> | void
  cancelPlan?: () => Promise<void> | void
  buildFromPlan?: () => Promise<void> | void
}

type AgentRuntimeValue = Record<string, unknown> & AgentRuntimeActions

const AgentRuntimeContext = createContext<AgentRuntimeValue | null>(null)

interface AgentRuntimeProviderProps {
  value: AgentRuntimeValue
  children: ReactNode
}

export function AgentRuntimeProvider({ value, children }: AgentRuntimeProviderProps) {
  return <AgentRuntimeContext.Provider value={value}>{children}</AgentRuntimeContext.Provider>
}

export function useAgentRuntime<TValue extends AgentRuntimeValue = AgentRuntimeValue>() {
  const context = useContext(AgentRuntimeContext)

  if (!context) {
    throw new Error('useAgentRuntime must be used within an AgentRuntimeProvider')
  }

  return context as TValue
}
