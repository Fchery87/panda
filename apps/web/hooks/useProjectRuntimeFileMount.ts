'use client'

import { useEffect, useRef } from 'react'
import type { WebContainer } from '@webcontainer/api'
import { useConvex } from 'convex/react'
import { toast } from 'sonner'

import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { mountProjectFiles } from '@/lib/webcontainer/fs-sync'

interface RuntimeFileMetadata {
  path: string
}

interface UseProjectRuntimeFileMountArgs {
  projectId: Id<'projects'>
  files: RuntimeFileMetadata[]
  webcontainerStatus: string
  webcontainerInstance?: WebContainer | null
}

export function useProjectRuntimeFileMount({
  projectId,
  files,
  webcontainerStatus,
  webcontainerInstance,
}: UseProjectRuntimeFileMountArgs) {
  const convex = useConvex()
  const mountedRuntimeProjectRef = useRef<string | null>(null)

  useEffect(() => {
    if (webcontainerStatus !== 'ready' || !webcontainerInstance) return
    if (mountedRuntimeProjectRef.current === projectId) return

    mountedRuntimeProjectRef.current = projectId
    const instance = webcontainerInstance
    const filePaths = files.map((file) => file.path)

    void convex
      .query(api.files.batchGet, { projectId, paths: filePaths })
      .then((runtimeFiles) => {
        const filesToMount = runtimeFiles
          .filter((file) => file.exists && file.content !== null)
          .map((file) => ({ path: file.path, content: file.content }))

        return mountProjectFiles(instance, filesToMount)
      })
      .catch((error) => {
        mountedRuntimeProjectRef.current = null
        toast.error('Failed to mount project files', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      })
  }, [convex, files, projectId, webcontainerInstance, webcontainerStatus])
}
