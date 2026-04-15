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

function isDirectoryPath(targetPath: string, allPaths: string[]): boolean {
  const prefix = `${targetPath}/`
  return allPaths.some((path) => path.startsWith(prefix))
}

function renamePathPrefix(path: string, oldPrefix: string, newPrefix: string): string {
  if (path === oldPrefix) return newPrefix
  if (!path.startsWith(`${oldPrefix}/`)) return path
  return `${newPrefix}${path.slice(oldPrefix.length)}`
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
        setCursorPosition(null)
        setOpenTabs((prev) => {
          if (prev.some((tab) => tab.path === path)) return prev
          return [...prev, { path }]
        })
      } catch (error) {
        toast.error('Failed to create file', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [
      projectId,
      setCursorPosition,
      setOpenTabs,
      setSelectedFileLocation,
      setSelectedFilePath,
      upsertFileMutation,
    ]
  )

  const handleFileRename = useCallback(
    async (oldPath: string, newPath: string) => {
      try {
        const allFiles = files ?? []
        const targetFiles = isDirectoryPath(
          oldPath,
          allFiles.map((candidate) => candidate.path)
        )
          ? allFiles.filter(
              (candidate) => candidate.path === oldPath || candidate.path.startsWith(`${oldPath}/`)
            )
          : allFiles.filter((candidate) => candidate.path === oldPath)

        if (targetFiles.length === 0) {
          toast.error('File not found')
          return
        }

        await Promise.all(
          targetFiles.map((file) =>
            upsertFileMutation({
              id: file._id,
              projectId,
              path: renamePathPrefix(file.path, oldPath, newPath),
              content: file.content,
              isBinary: file.isBinary,
            })
          )
        )

        toast.success(`Renamed to ${newPath}`)
        setOpenTabs((prev) =>
          prev.map((tab) => ({
            ...tab,
            path: renamePathPrefix(tab.path, oldPath, newPath),
          }))
        )
        if (selectedFilePath === oldPath || selectedFilePath?.startsWith(`${oldPath}/`)) {
          setSelectedFilePath(renamePathPrefix(selectedFilePath, oldPath, newPath))
          setSelectedFileLocation(null)
          setCursorPosition(null)
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
      setCursorPosition,
      setOpenTabs,
      selectedFilePath,
      setSelectedFileLocation,
      setSelectedFilePath,
      upsertFileMutation,
    ]
  )

  const handleFileDelete = useCallback(
    async (path: string) => {
      try {
        const allFiles = files ?? []
        const targetFiles = isDirectoryPath(
          path,
          allFiles.map((candidate) => candidate.path)
        )
          ? allFiles.filter(
              (candidate) => candidate.path === path || candidate.path.startsWith(`${path}/`)
            )
          : allFiles.filter((candidate) => candidate.path === path)

        if (targetFiles.length === 0) {
          toast.error('File not found')
          return
        }

        await Promise.all(targetFiles.map((file) => deleteFileMutation({ id: file._id })))
        toast.success(`Deleted ${path}`)

        setOpenTabs((prev) =>
          prev.filter((tab) => tab.path !== path && !tab.path.startsWith(`${path}/`))
        )

        if (selectedFilePath === path || selectedFilePath?.startsWith(`${path}/`)) {
          setSelectedFilePath(null)
          setSelectedFileLocation(null)
          setCursorPosition(null)
        }
      } catch (error) {
        toast.error('Failed to delete file', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [
      deleteFileMutation,
      files,
      selectedFilePath,
      setCursorPosition,
      setOpenTabs,
      setSelectedFileLocation,
      setSelectedFilePath,
    ]
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
