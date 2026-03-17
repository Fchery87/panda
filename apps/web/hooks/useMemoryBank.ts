'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useCallback } from 'react'

export interface UseMemoryBankResult {
  memoryBankContent: string | null | undefined
  updateMemoryBank: (content: string) => Promise<void>
}

export function useMemoryBank(projectId: Id<'projects'> | undefined): UseMemoryBankResult {
  const memoryBankContent = useQuery(api.memoryBank.get, projectId ? { projectId } : 'skip')

  const updateMemoryBankMutation = useMutation(api.memoryBank.update)

  const updateMemoryBank = useCallback(
    async (content: string) => {
      if (!projectId) return
      await updateMemoryBankMutation({ projectId, content })
    },
    [projectId, updateMemoryBankMutation]
  )

  return { memoryBankContent, updateMemoryBank }
}
