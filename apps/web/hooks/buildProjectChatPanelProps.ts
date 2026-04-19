import type { ComponentProps } from 'react'
import type { ProjectChatPanel } from '@/components/projects/ProjectChatPanel'

type ProjectChatPanelProps = ComponentProps<typeof ProjectChatPanel>

export function buildProjectChatPanelProps(props: ProjectChatPanelProps): ProjectChatPanelProps {
  return props
}
