import type { ComponentProps } from 'react'
import type { ProjectWorkspaceLayout } from '@/components/projects/ProjectWorkspaceLayout'

type ProjectWorkspaceLayoutProps = ComponentProps<typeof ProjectWorkspaceLayout>

export function buildProjectWorkspaceLayoutProps(
  props: ProjectWorkspaceLayoutProps
): ProjectWorkspaceLayoutProps {
  return props
}
