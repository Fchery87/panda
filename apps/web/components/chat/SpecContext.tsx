/**
 * SpecContext - React Context for specification state
 *
 * Eliminates prop drilling for spec-related state throughout the chat panel.
 * Provides centralized access to spec state, pending approvals, and actions.
 */

'use client'

import { createContext, useContext, useCallback, useState, type ReactNode } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import type { FormalSpecification, SpecTier } from '@/lib/agent/spec/types'

interface SpecState {
  /** Currently active spec being executed */
  currentSpec: FormalSpecification | null
  /** Spec pending user approval */
  pendingSpec: FormalSpecification | null
  /** Current spec tier selection */
  specTier: SpecTier
  /** Whether a spec is being generated */
  isGenerating: boolean
}

interface SpecContextValue {
  // State
  state: SpecState
  projectId: Id<'projects'>
  chatId: Id<'chats'> | null

  // Actions
  approveSpec: (specId: string) => void
  rejectSpec: (specId: string) => void
  setSpecTier: (tier: SpecTier) => void
  setCurrentSpec: (spec: FormalSpecification | null) => void
  setPendingSpec: (spec: FormalSpecification | null) => void
}

const SpecContext = createContext<SpecContextValue | null>(null)

interface SpecProviderProps {
  children: ReactNode
  projectId: Id<'projects'>
  chatId?: Id<'chats'> | null
  initialTier?: SpecTier
}

export function SpecProvider({
  children,
  projectId,
  chatId = null,
  initialTier = 'ambient',
}: SpecProviderProps) {
  const [state, setState] = useState<SpecState>({
    currentSpec: null,
    pendingSpec: null,
    specTier: initialTier,
    isGenerating: false,
  })

  const approveSpec = useCallback(
    (specId: string) => {
      console.log('[SpecContext] Approving spec:', { specId, projectId, chatId })
      // This will be connected to the actual spec approval flow
      setState((prev) => ({
        ...prev,
        pendingSpec: null,
      }))
    },
    [projectId, chatId]
  )

  const rejectSpec = useCallback(
    (specId: string) => {
      console.log('[SpecContext] Rejecting spec:', { specId, projectId, chatId })
      // This will be connected to the actual spec rejection flow
      setState((prev) => ({
        ...prev,
        pendingSpec: null,
      }))
    },
    [projectId, chatId]
  )

  const setSpecTier = useCallback((tier: SpecTier) => {
    setState((prev) => ({
      ...prev,
      specTier: tier,
    }))
  }, [])

  const setCurrentSpec = useCallback((spec: FormalSpecification | null) => {
    setState((prev) => ({
      ...prev,
      currentSpec: spec,
    }))
  }, [])

  const setPendingSpec = useCallback((spec: FormalSpecification | null) => {
    setState((prev) => ({
      ...prev,
      pendingSpec: spec,
    }))
  }, [])

  const value: SpecContextValue = {
    state,
    projectId,
    chatId,
    approveSpec,
    rejectSpec,
    setSpecTier,
    setCurrentSpec,
    setPendingSpec,
  }

  return <SpecContext.Provider value={value}>{children}</SpecContext.Provider>
}

export function useSpecContext(): SpecContextValue {
  const context = useContext(SpecContext)
  if (!context) {
    throw new Error('useSpecContext must be used within a SpecProvider')
  }
  return context
}

export function useSpec(): SpecState {
  return useSpecContext().state
}

export function useCurrentSpec(): FormalSpecification | null {
  return useSpecContext().state.currentSpec
}

export function usePendingSpec(): FormalSpecification | null {
  return useSpecContext().state.pendingSpec
}

export function useSpecTier(): SpecTier {
  return useSpecContext().state.specTier
}
