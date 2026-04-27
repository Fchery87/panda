'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import { toast } from 'sonner'
import {
  derivePreviewDiffEntries,
  deriveWorkspaceArtifactPreviews,
  resolveArtifactPreviewNavigation,
  type WorkspaceArtifactPreview,
} from '@/components/workbench/artifact-preview'
import { getPrimaryArtifactAction } from '@/lib/artifacts/executeArtifact'
import { useArtifactController } from './useArtifactController'

type ArtifactAction = ReturnType<typeof getPrimaryArtifactAction>

interface ArtifactRecord {
  _id: Id<'artifacts'>
  actions: NonNullable<ArtifactAction>[]
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rejected'
  createdAt: number
}

interface Chat {
  _id: Id<'chats'>
}

interface OpenTab {
  path: string
}

interface OpenTab {
  path: string
}

type FileLocation = {
  line: number
  column: number
  nonce: number
} | null

type CursorPosition = {
  line: number
  column: number
} | null

type MobilePrimaryPanel = 'workspace' | 'chat' | 'review'

interface UseArtifactLifecycleArgs {
  projectId: Id<'projects'>
  activeChat: Chat | null
  autoApply?: boolean
  selectedFilePath: string | null
  openTabs: OpenTab[]
  setOpenTabs: React.Dispatch<React.SetStateAction<OpenTab[]>>
  setSelectedFilePath: (path: string | null) => void
  setSelectedFileLocation: (loc: FileLocation) => void
  setCursorPosition: (pos: CursorPosition) => void
  setMobilePrimaryPanel: (panel: MobilePrimaryPanel) => void
  writeFileToRuntime?: (path: string, content: string) => Promise<unknown>
}

export function useArtifactLifecycle({
  projectId,
  activeChat,
  autoApply = false,
  selectedFilePath,
  openTabs,
  setOpenTabs,
  setSelectedFilePath,
  setSelectedFileLocation,
  setCursorPosition,
  setMobilePrimaryPanel,
  writeFileToRuntime,
}: UseArtifactLifecycleArgs) {
  const seenPendingArtifactIdsRef = useRef<Set<string>>(new Set())
  const autoApplyQueueRef = useRef<Set<string>>(new Set())
  const artifactController = useArtifactController({
    projectId,
    chatId: activeChat?._id,
    writeFileToRuntime,
  })
  const artifactRecords = artifactController.records as ArtifactRecord[] | undefined

  const pendingArtifactPreviews = useMemo(
    () => deriveWorkspaceArtifactPreviews((artifactRecords ?? []).map((record) => ({ ...record }))),
    [artifactRecords]
  )

  const pendingArtifactPreview = useMemo<WorkspaceArtifactPreview | null>(() => {
    if (!selectedFilePath) return null
    return pendingArtifactPreviews.find((preview) => preview.filePath === selectedFilePath) ?? null
  }, [pendingArtifactPreviews, selectedFilePath])

  const pendingDiffEntries = useMemo(
    () => derivePreviewDiffEntries(pendingArtifactPreviews),
    [pendingArtifactPreviews]
  )

  const pendingChangedFilesCount = pendingArtifactPreviews.length

  useEffect(() => {
    seenPendingArtifactIdsRef.current.clear()
    autoApplyQueueRef.current.clear()
  }, [activeChat?._id])

  useEffect(() => {
    if (pendingArtifactPreviews.length === 0) return

    const newPreviews = pendingArtifactPreviews.filter(
      (preview) => !seenPendingArtifactIdsRef.current.has(preview.artifactId)
    )

    if (newPreviews.length === 0) return

    for (const preview of newPreviews) {
      seenPendingArtifactIdsRef.current.add(preview.artifactId)
    }

    const targetPreview = newPreviews[0]
    const navigation = resolveArtifactPreviewNavigation({
      preview: targetPreview,
      openTabs,
      selectedFilePath,
    })

    if (navigation.shouldOpenTab) {
      setOpenTabs((prev) => {
        if (prev.some((tab) => tab.path === targetPreview.filePath)) return prev
        return [...prev, { path: targetPreview.filePath }]
      })
    }

    if (navigation.shouldSelectFile) {
      setMobilePrimaryPanel('workspace')
      setSelectedFilePath(targetPreview.filePath)
      setSelectedFileLocation(null)
      setCursorPosition(null)
    }
  }, [
    openTabs,
    pendingArtifactPreviews,
    selectedFilePath,
    setCursorPosition,
    setMobilePrimaryPanel,
    setOpenTabs,
    setSelectedFileLocation,
    setSelectedFilePath,
  ])

  const handleApplyPendingArtifact = useCallback(
    async (artifactId: string) => {
      const record = artifactRecords?.find((artifact) => artifact._id === artifactId)
      const action = record ? getPrimaryArtifactAction(record) : null
      if (!record || !action) return

      try {
        await artifactController.applyOne(record._id)
        toast.success('Applied pending artifact', {
          description:
            action.type === 'file_write' ? action.payload.filePath : action.payload.command,
        })
      } catch (error) {
        toast.error('Failed to apply pending artifact', {
          description: error instanceof Error ? error.message : String(error),
        })
      }
    },
    [artifactRecords, artifactController]
  )

  useEffect(() => {
    if (!autoApply || !artifactRecords) return

    const pendingRecords = artifactRecords.filter(
      (r) => r.status === 'pending' && !autoApplyQueueRef.current.has(r._id)
    )
    if (pendingRecords.length === 0) return

    for (const record of pendingRecords) {
      autoApplyQueueRef.current.add(record._id)
      void handleApplyPendingArtifact(record._id)
    }
  }, [autoApply, artifactRecords, handleApplyPendingArtifact])

  const handleRejectPendingArtifact = useCallback(
    async (artifactId: string) => {
      await artifactController.rejectOne(artifactId)
    },
    [artifactController]
  )

  return {
    artifactRecords,
    pendingArtifactPreview,
    pendingDiffEntries,
    pendingChangedFilesCount,
    handleApplyPendingArtifact,
    handleRejectPendingArtifact,
  }
}
