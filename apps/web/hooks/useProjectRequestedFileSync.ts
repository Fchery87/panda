'use client'

import { useEffect } from 'react'

interface ProjectFileLike {
  path: string
}

interface OpenTabLike {
  path: string
}

interface UseProjectRequestedFileSyncParams {
  files: ProjectFileLike[] | undefined
  requestedFilePath: string | null
  setSelectedFilePath: (path: string) => void
  setSelectedFileLocation: (location: { line: number; column?: number } | null) => void
  setCursorPosition: (position: { line: number; column: number } | null) => void
  setOpenTabs: (updater: (prev: OpenTabLike[]) => OpenTabLike[]) => void
}

export function useProjectRequestedFileSync({
  files,
  requestedFilePath,
  setSelectedFilePath,
  setSelectedFileLocation,
  setCursorPosition,
  setOpenTabs,
}: UseProjectRequestedFileSyncParams) {
  useEffect(() => {
    if (!requestedFilePath || !files?.some((file) => file.path === requestedFilePath)) return

    setSelectedFilePath(requestedFilePath)
    setSelectedFileLocation(null)
    setCursorPosition(null)
    setOpenTabs((prev) => {
      if (prev.some((tab) => tab.path === requestedFilePath)) return prev
      return [...prev, { path: requestedFilePath }]
    })
  }, [
    files,
    requestedFilePath,
    setCursorPosition,
    setOpenTabs,
    setSelectedFileLocation,
    setSelectedFilePath,
  ])
}
