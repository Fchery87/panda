'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useConvex, useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { toast } from 'sonner'
import {
  derivePreviewDiffEntries,
  deriveWorkspaceArtifactPreviews,
  resolveArtifactPreviewNavigation,
  type WorkspaceArtifactPreview,
} from '@/components/workbench/artifact-preview'
import { getPrimaryArtifactAction } from '@/lib/artifacts/executeArtifact'
import { applyArtifact } from '@/lib/artifacts/executeArtifact'

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
  selectedFilePath: string | null
  openTabs: OpenTab[]
  setOpenTabs: React.Dispatch<React.SetStateAction<OpenTab[]>>
  setSelectedFilePath: (path: string | null) => void
  setSelectedFileLocation: (loc: FileLocation) => void
  setCursorPosition: (pos: CursorPosition) => void
  setMobilePrimaryPanel: (panel: MobilePrimaryPanel) => void
}

export function useArtifactLifecycle({
  projectId,
  activeChat,
  selectedFilePath,
  openTabs,
  setOpenTabs,
  setSelectedFilePath,
  setSelectedFileLocation,
  setCursorPosition,
  setMobilePrimaryPanel,
}: UseArtifactLifecycleArgs) {
  const convex = useConvex()
  const seenPendingArtifactIdsRef = useRef<Set<string>>(new Set())

  const artifactRecords = useQuery(
    api.artifacts.list,
    activeChat ? { chatId: activeChat._id } : 'skip'
  ) as ArtifactRecord[] | undefined

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

  const upsertFileMutation = useMutation(api.files.upsert)
  const createAndExecuteJobMutation = useMutation(api.jobs.createAndExecute)
  const updateJobStatusMutation = useMutation(api.jobs.updateStatus)
  const updateArtifactStatusMutation = useMutation(api.artifacts.updateStatus)

  useEffect(() => {
    seenPendingArtifactIdsRef.current.clear()
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
        await applyArtifact({
          artifactId: record._id,
          action,
          projectId,
          convex,
          upsertFile: upsertFileMutation,
          createAndExecuteJob: createAndExecuteJobMutation,
          updateJobStatus: (jobId, status, updates) =>
            updateJobStatusMutation({
              id: jobId,
              status,
              ...updates,
            }),
          updateArtifactStatus: updateArtifactStatusMutation,
        })
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
    [
      artifactRecords,
      convex,
      createAndExecuteJobMutation,
      projectId,
      updateArtifactStatusMutation,
      updateJobStatusMutation,
      upsertFileMutation,
    ]
  )

  const handleRejectPendingArtifact = useCallback(
    async (artifactId: string) => {
      await updateArtifactStatusMutation({
        id: artifactId as Id<'artifacts'>,
        status: 'rejected',
      })
    },
    [updateArtifactStatusMutation]
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
