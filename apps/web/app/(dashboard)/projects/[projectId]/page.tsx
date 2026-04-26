'use client'

import { useParams } from 'next/navigation'

import type { Id } from '@convex/_generated/dataModel'

import { ProjectShellDataLoader } from '@/components/projects/ProjectShellDataLoader'
import { WebcontainerProvider } from '@/lib/webcontainer/WebcontainerProvider'
import { WorkspaceStoresProvider } from '@/stores/WorkspaceStoresProvider'

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.projectId as Id<'projects'>

  return (
    <WebcontainerProvider>
      <WorkspaceStoresProvider projectId={projectId}>
        <ProjectShellDataLoader projectId={projectId} />
      </WorkspaceStoresProvider>
    </WebcontainerProvider>
  )
}
