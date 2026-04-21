import type { GeneratedPlanArtifact, WorkspacePlanTabRef } from '@/lib/planning/types'

export interface WorkspaceFileLocation {
  line: number
  column: number
  nonce: number
}

export interface WorkspaceFileTab {
  kind?: 'file'
  path: string
  isDirty?: boolean
}

export interface WorkspacePlanTab extends WorkspacePlanTabRef {
  path: string
  artifact: GeneratedPlanArtifact
}

export type WorkspaceOpenTab = WorkspaceFileTab | WorkspacePlanTab

export function isWorkspacePlanTab(tab: WorkspaceOpenTab): tab is WorkspacePlanTab {
  return tab.kind === 'plan'
}
