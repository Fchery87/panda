'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

import { ProjectLoadingGuard, ProjectNotFoundGuard } from '@/components/projects/ProjectPageGuards'
import { WorkspaceRuntimeProvider } from '@/components/projects/WorkspaceRuntimeProvider'

interface ProjectShellDataLoaderProps {
  projectId: Id<'projects'>
}

export function ProjectShellDataLoader({ projectId }: ProjectShellDataLoaderProps) {
  const project = useQuery(api.projects.get, { id: projectId })
  const files = useQuery(api.files.list, { projectId })
  const chats = useQuery(api.chats.list, { projectId })

  if (project === null) return <ProjectNotFoundGuard />
  if (project === undefined || !files) {
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
