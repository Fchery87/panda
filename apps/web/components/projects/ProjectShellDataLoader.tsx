'use client'

import { useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

import { ProjectLoadingGuard, ProjectNotFoundGuard } from '@/components/projects/ProjectPageGuards'
import { WorkspaceRuntimeProvider } from '@/components/projects/WorkspaceRuntimeProvider'
import { logConvexPayload } from '@/lib/convex/payload-metrics'
import { getProjectBootQueryArgs } from '@/lib/convex/query-shapes'

interface ProjectShellDataLoaderProps {
  projectId: Id<'projects'>
}

export function ProjectShellDataLoader({ projectId }: ProjectShellDataLoaderProps) {
  const projectBootQueryArgs = getProjectBootQueryArgs(projectId)
  const project = useQuery(api.projects.get, { id: projectId })
  const files = useQuery(api.files.listMetadata, projectBootQueryArgs.files)
  const chats = useQuery(api.chats.listRecent, projectBootQueryArgs.chats)

  useEffect(() => {
    logConvexPayload('project.files.metadata', files)
  }, [files])

  useEffect(() => {
    logConvexPayload('project.chats.recent', chats)
  }, [chats])

  if (project === null) return <ProjectNotFoundGuard />
  if (project === undefined || files === undefined || chats === undefined) {
    return <ProjectLoadingGuard projectLoaded={project !== undefined} />
  }

  return (
    <WorkspaceRuntimeProvider
      projectId={projectId}
      project={project as never}
      files={files as never}
      chats={chats as never}
    />
  )
}
