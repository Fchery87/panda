'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { FormalSpecification } from '../lib/agent/spec/types'
import { SpecPersistenceState } from '../lib/agent/spec/persistence'
import type { AgentRuntimeLike } from '../lib/agent'

export interface UseSpecManagementResult {
  currentSpec: FormalSpecification | null
  pendingSpec: FormalSpecification | null
  setCurrentSpec: React.Dispatch<React.SetStateAction<FormalSpecification | null>>
  setPendingSpec: React.Dispatch<React.SetStateAction<FormalSpecification | null>>
  approvePendingSpec: (spec?: FormalSpecification) => void
  updatePendingSpecDraft: (spec: FormalSpecification) => void
  cancelPendingSpec: () => void
  createSpecMutation: ReturnType<typeof useMutation<typeof api.specifications.create>>
  updateSpecMutation: ReturnType<typeof useMutation<typeof api.specifications.update>>
  specPersistenceRef: React.RefObject<SpecPersistenceState>
}

export function useSpecManagement(
  projectId: Id<'projects'> | undefined,
  chatId: Id<'chats'> | undefined,
  runtimeRef: React.RefObject<AgentRuntimeLike | null>,
  setStatus: (
    status: 'idle' | 'thinking' | 'streaming' | 'executing_tools' | 'complete' | 'error'
  ) => void
): UseSpecManagementResult {
  const [currentSpec, setCurrentSpec] = useState<FormalSpecification | null>(null)
  const [pendingSpec, setPendingSpec] = useState<FormalSpecification | null>(null)
  const specPersistenceRef = useRef(new SpecPersistenceState())

  const createSpecMutation = useMutation(api.specifications.create)
  const updateSpecMutation = useMutation(api.specifications.update)

  const approvePendingSpec = useCallback(
    (spec?: FormalSpecification) => {
      const nextSpec = spec ?? pendingSpec
      if (!nextSpec) return
      setPendingSpec(null)
      setCurrentSpec(nextSpec)
      setStatus('thinking')
      runtimeRef.current?.resolveSpecApproval?.('approve', nextSpec)
    },
    [pendingSpec, setStatus, runtimeRef]
  )

  const updatePendingSpecDraft = useCallback((spec: FormalSpecification) => {
    setPendingSpec(spec)
    setCurrentSpec(spec)
  }, [])

  const cancelPendingSpec = useCallback(() => {
    setPendingSpec(null)
    setCurrentSpec(null)
    runtimeRef.current?.resolveSpecApproval?.('cancel')
    setStatus('idle')
  }, [runtimeRef, setStatus])

  return {
    currentSpec,
    pendingSpec,
    setCurrentSpec,
    setPendingSpec,
    approvePendingSpec,
    updatePendingSpecDraft,
    cancelPendingSpec,
    createSpecMutation,
    updateSpecMutation,
    specPersistenceRef,
  }
}
