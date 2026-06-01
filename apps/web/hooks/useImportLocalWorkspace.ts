'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'

import type { Id } from '@convex/_generated/dataModel'

interface LocalWorkspaceFilePayload {
  path: string
  content?: string
  isBinary: boolean
}

interface LocalWorkspaceImportPayload {
  files?: LocalWorkspaceFilePayload[]
  truncated?: boolean
}

interface UseImportLocalWorkspaceArgs {
  projectId: Id<'projects'>
  importWorkspaceFile: (args: {
    projectId: Id<'projects'>
    path: string
    content: string
    isBinary: false
  }) => Promise<unknown>
}

export function useImportLocalWorkspace({
  projectId,
  importWorkspaceFile,
}: UseImportLocalWorkspaceArgs) {
  return useCallback(async () => {
    try {
      const response = await fetch('/api/local-workspace/files?maxFiles=500')
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? 'Local workspace import is unavailable')
      }

      const payload = (await response.json()) as LocalWorkspaceImportPayload
      const importableFiles = (payload.files ?? []).filter(
        (file) => !file.isBinary && typeof file.content === 'string'
      )

      if (importableFiles.length === 0) {
        toast.info('No importable local files found')
        return
      }

      await Promise.all(
        importableFiles.map((file) =>
          importWorkspaceFile({
            projectId,
            path: file.path,
            content: file.content ?? '',
            isBinary: false,
          })
        )
      )

      toast.success('Imported local workspace files', {
        description: `${importableFiles.length} file${importableFiles.length === 1 ? '' : 's'} imported${
          payload.truncated ? ' (scan truncated)' : ''
        }`,
      })
    } catch (error) {
      toast.error('Failed to import local workspace', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }, [importWorkspaceFile, projectId])
}
