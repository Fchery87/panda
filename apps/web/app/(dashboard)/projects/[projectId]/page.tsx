'use client'

import { useParams } from 'next/navigation'

import type { Id } from '@convex/_generated/dataModel'

import { ProjectShellDataLoader } from '@/components/projects/ProjectShellDataLoader'
import { WorkspaceStoresProvider } from '@/stores/WorkspaceStoresProvider'

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.projectId as Id<'projects'>

  return (
    <WorkspaceStoresProvider projectId={projectId}>
      <ProjectShellDataLoader projectId={projectId} />
    </WorkspaceStoresProvider>
  )
}
