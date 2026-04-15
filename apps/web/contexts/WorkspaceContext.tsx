'use client'

import {
  createContext,
  useContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

import type { Id } from '@convex/_generated/dataModel'

import type { SidebarSection } from '@/components/sidebar/SidebarRail'
import type { ChatMode } from '@/lib/agent/prompt-library'
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

interface FileState {
  selectedFilePath: string | null
  setSelectedFilePath: Dispatch<SetStateAction<string | null>>
  selectedFileLocation: WorkspaceFileLocation | null
  setSelectedFileLocation: Dispatch<SetStateAction<WorkspaceFileLocation | null>>
  openTabs: WorkspaceOpenTab[]
  setOpenTabs: Dispatch<SetStateAction<WorkspaceOpenTab[]>>
  cursorPosition: { line: number; column: number } | null
  setCursorPosition: Dispatch<SetStateAction<{ line: number; column: number } | null>>
}

interface SidebarState {
  activeSection: SidebarSection
  isFlyoutOpen: boolean
  handleSectionChange: (section: SidebarSection) => void
  toggleFlyout: () => void
}

interface LayoutState {
  isMobileLayout: boolean
  isCompactDesktopLayout: boolean
  mobilePrimaryPanel: 'workspace' | 'chat' | 'review'
  setMobilePrimaryPanel: Dispatch<SetStateAction<'workspace' | 'chat' | 'review'>>
}

interface ProjectState {
  projectId: Id<'projects'>
  activeChatId?: Id<'chats'>
  chatMode: ChatMode
  onSelectChat: (chatId: Id<'chats'>) => void
  onNewChat: () => void
}

export interface WorkspaceContextValue extends FileState, SidebarState, LayoutState, ProjectState {}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

interface WorkspaceProviderProps {
  value: WorkspaceContextValue
  children: ReactNode
}

export function WorkspaceProvider({ value, children }: WorkspaceProviderProps) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext)

  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }

  return context
}
