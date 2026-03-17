'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useMemo } from 'react'
import {
  generateRepoOverview,
  formatOverviewForPrompt,
  type FileInfo,
} from '../lib/agent/context/repo-overview'
import { appLog } from '@/lib/logger'

export interface UseProjectContextResult {
  projectFiles: Array<{ path: string; updatedAt: number }> | undefined
  projectOverviewContent: string | null
}

export function useProjectContext(
  projectId: Id<'projects'> | undefined,
  projectName: string | undefined,
  projectDescription: string | undefined
): UseProjectContextResult {
  // Project files for overview generation (metadata only, no content)
  const projectFiles = useQuery(
    api.files.listMetadata,
    projectId ? { projectId: projectId as Id<'projects'> } : 'skip'
  )

  // Project overview - computed on-demand, not stored as file
  const projectOverviewContent = useMemo(() => {
    if (!projectFiles || !projectName || projectFiles.length === 0) {
      return null
    }

    try {
      // Note: projectFiles now only contains metadata (no content)
      // Content is loaded on-demand via batchGet when needed
      const fileInfos: FileInfo[] = projectFiles.map((f) => ({
        path: f.path,
        content: '', // Content loaded on-demand
        updatedAt: f.updatedAt,
      }))

      const overview = generateRepoOverview(fileInfos, projectName, projectDescription)
      return formatOverviewForPrompt(overview)
    } catch (err) {
      appLog.warn('[useProjectContext] Failed to generate project overview:', err)
      return null
    }
  }, [projectFiles, projectName, projectDescription])

  return { projectFiles, projectOverviewContent }
}
