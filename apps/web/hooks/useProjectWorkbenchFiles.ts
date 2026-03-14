'use client'

import { useCallback, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { Dispatch, SetStateAction } from 'react'
import { toast } from 'sonner'

type ProjectWorkbenchFile = {
  _id: Id<'files'>
  path: string
  content: string
  isBinary: boolean
}

type OpenProjectTab = {
  path: string
  isDirty?: boolean
}

type EditorLocation = {
  line: number
  column: number
}

type SelectedFileLocation = EditorLocation & {
  nonce: number
}

export function useProjectWorkbenchFiles(args: {
  projectId: Id<'projects'>
  files: ProjectWorkbenchFile[] | undefined
  selectedFilePath: string | null
  setSelectedFilePath: (path: string | null) => void
  setSelectedFileLocation: (location: SelectedFileLocation | null) => void
  setCursorPosition: (position: EditorLocation | null) => void
  setOpenTabs: Dispatch<SetStateAction<OpenProjectTab[]>>
  setMobilePrimaryPanel: (panel: 'workspace' | 'chat') => void
}) {
  const {
    projectId,
    files,
    selectedFilePath,
    setSelectedFilePath,
    setSelectedFileLocation,
    setCursorPosition,
    setOpenTabs,
    setMobilePrimaryPanel,
  } = args

  const upsertFileMutation = useMutation(api.files.upsert)
  const deleteFileMutation = useMutation(api.files.remove)
  const updateProjectMutation = useMutation(api.projects.update)

  useEffect(() => {
    if (!projectId) return

    updateProjectMutation({
      id: projectId,
      lastOpenedAt: Date.now(),
    }).catch((error) => {
      void error
    })
  }, [projectId, updateProjectMutation])

  const handleFileSelect = useCallback(
    (path: string, location?: EditorLocation) => {
      setMobilePrimaryPanel('workspace')
      setSelectedFilePath(path)
      if (location) {
        setSelectedFileLocation({
          ...location,
          nonce: Date.now(),
        })
        setCursorPosition({ line: location.line, column: location.column })
      } else {
        setSelectedFileLocation(null)
        setCursorPosition(null)
      }
      setOpenTabs((prev) => {
        if (prev.some((tab) => tab.path === path)) return prev
        return [...prev, { path }]
      })
    },
    [
      setCursorPosition,
      setMobilePrimaryPanel,
      setOpenTabs,
      setSelectedFileLocation,
      setSelectedFilePath,
    ]
  )

  const handleTabClose = useCallback(
    (path: string) => {
      setOpenTabs((prev) => {
        const next = prev.filter((tab) => tab.path !== path)
        if (next.length === 0) {
          setSelectedFilePath(null)
        } else if (selectedFilePath === path) {
          const index = prev.findIndex((tab) => tab.path === path)
          const nextTab = next[Math.min(index, next.length - 1)]
          setSelectedFilePath(nextTab?.path ?? null)
        }
        return next
      })
    },
    [selectedFilePath, setOpenTabs, setSelectedFilePath]
  )

  const handleFileCreate = useCallback(
    async (path: string) => {
      try {
        await upsertFileMutation({
          projectId,
          path,
          content: '',
          isBinary: false,
        })
        toast.success(`Created ${path}`)
        setSelectedFilePath(path)
        setSelectedFileLocation(null)
      } catch (error) {
        toast.error('Failed to create file', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [projectId, setSelectedFileLocation, setSelectedFilePath, upsertFileMutation]
  )

  const handleFileRename = useCallback(
    async (oldPath: string, newPath: string) => {
      try {
        const file = files?.find((candidate) => candidate.path === oldPath)
        if (!file) {
          toast.error('File not found')
          return
        }

        await upsertFileMutation({
          id: file._id,
          projectId,
          path: newPath,
          content: file.content,
          isBinary: file.isBinary,
        })

        toast.success(`Renamed to ${newPath}`)
        if (selectedFilePath === oldPath) {
          setSelectedFilePath(newPath)
          setSelectedFileLocation(null)
        }
      } catch (error) {
        toast.error('Failed to rename file', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [
      files,
      projectId,
      selectedFilePath,
      setSelectedFileLocation,
      setSelectedFilePath,
      upsertFileMutation,
    ]
  )

  const handleFileDelete = useCallback(
    async (path: string) => {
      try {
        const file = files?.find((candidate) => candidate.path === path)
        if (!file) {
          toast.error('File not found')
          return
        }

        await deleteFileMutation({ id: file._id })
        toast.success(`Deleted ${path}`)

        if (selectedFilePath === path) {
          setSelectedFilePath(null)
          setSelectedFileLocation(null)
        }
      } catch (error) {
        toast.error('Failed to delete file', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [deleteFileMutation, files, selectedFilePath, setSelectedFileLocation, setSelectedFilePath]
  )

  const handleEditorSave = useCallback(
    async (filePath: string, content: string) => {
      try {
        const file = files?.find((candidate) => candidate.path === filePath)
        await upsertFileMutation({
          id: file?._id,
          projectId,
          path: filePath,
          content,
          isBinary: false,
        })
        toast.success(`Saved ${filePath}`)
      } catch (error) {
        toast.error('Failed to save file', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [files, projectId, upsertFileMutation]
  )

  const handleEditorDirtyChange = useCallback(
    (filePath: string, isDirty: boolean) => {
      setOpenTabs((prev) => {
        let changed = false
        const next = prev.map((tab) => {
          if (tab.path !== filePath) return tab
          if (tab.isDirty === isDirty) return tab
          changed = true
          return { ...tab, isDirty }
        })

        return changed ? next : prev
      })
    },
    [setOpenTabs]
  )

  return {
    handleFileSelect,
    handleTabClose,
    handleFileCreate,
    handleFileRename,
    handleFileDelete,
    handleEditorSave,
    handleEditorDirtyChange,
  }
}
