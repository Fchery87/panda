'use client'

import { useEffect, useRef } from 'react'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'
import {
  createPlanArtifactWorkspaceTab,
  upsertPlanArtifactWorkspaceTab,
} from '@/components/workbench/PlanArtifactTab'

interface OpenTab {
  path: string
}

type FileLocation = {
  line: number
  column: number
  nonce: number
} | null

type CursorPosition = {
  line: number
  column: number
} | null

type MobilePrimaryPanel = 'work' | 'chat' | 'changes' | 'proof'
type WorkspaceFocusMode = 'chat' | 'workbench' | 'proof' | 'changes'
type CenterTab = 'editor' | 'diff' | 'logs' | 'tests'

interface UsePlanArtifactSyncArgs {
  activePlanArtifact: GeneratedPlanArtifact | null | undefined
  openTabs: OpenTab[]
  resetGeneration: number
  setOpenTabs: React.Dispatch<React.SetStateAction<OpenTab[]>>
  setSelectedFilePath: (path: string | null) => void
  setSelectedFileLocation: (loc: FileLocation) => void
  setCursorPosition: (pos: CursorPosition) => void
  setMobilePrimaryPanel: (panel: MobilePrimaryPanel) => void
  setWorkspaceFocusMode?: (mode: WorkspaceFocusMode) => void
  setActiveCenterTab?: (tab: CenterTab) => void
}

export function usePlanArtifactSync({
  activePlanArtifact,
  openTabs,
  resetGeneration,
  setOpenTabs,
  setSelectedFilePath,
  setSelectedFileLocation,
  setCursorPosition,
  setMobilePrimaryPanel,
  setWorkspaceFocusMode,
  setActiveCenterTab,
}: UsePlanArtifactSyncArgs) {
  const lastOpenedPlanArtifactRef = useRef<string | null>(null)
  const lastSyncedPlanArtifactRef = useRef<string | null>(null)
  const lastHandledResetGenerationRef = useRef(resetGeneration)

  const activePlanArtifactOpenKey = activePlanArtifact
    ? `${activePlanArtifact.sessionId}:${activePlanArtifact.generatedAt}`
    : null
  const activePlanArtifactRevisionKey = activePlanArtifact
    ? `${activePlanArtifact.sessionId}:${activePlanArtifact.generatedAt}:${activePlanArtifact.status}`
    : null

  useEffect(() => {
    if (!activePlanArtifact || !activePlanArtifactOpenKey || !activePlanArtifactRevisionKey) return

    const nextPlanTab = createPlanArtifactWorkspaceTab(activePlanArtifact)
    const isPlanTabOpen = openTabs.some((tab) => tab.path === nextPlanTab.path)
    const isPlanArtifactRevisionSynced =
      lastSyncedPlanArtifactRef.current === activePlanArtifactRevisionKey
    const resetGenerationChanged = lastHandledResetGenerationRef.current !== resetGeneration

    if (isPlanArtifactRevisionSynced && isPlanTabOpen) {
      lastHandledResetGenerationRef.current = resetGeneration
      return
    }

    if (isPlanArtifactRevisionSynced && !resetGenerationChanged) return

    setOpenTabs((prev) => upsertPlanArtifactWorkspaceTab(prev, activePlanArtifact))
    lastSyncedPlanArtifactRef.current = activePlanArtifactRevisionKey
    lastHandledResetGenerationRef.current = resetGeneration

    if (
      lastOpenedPlanArtifactRef.current !== activePlanArtifactOpenKey ||
      (resetGenerationChanged && !isPlanTabOpen)
    ) {
      setSelectedFilePath(nextPlanTab.path)
      setSelectedFileLocation(null)
      setCursorPosition(null)
      setMobilePrimaryPanel('work')
      setWorkspaceFocusMode?.('workbench')
      setActiveCenterTab?.('editor')
      lastOpenedPlanArtifactRef.current = activePlanArtifactOpenKey
    }
  }, [
    activePlanArtifact,
    activePlanArtifactOpenKey,
    activePlanArtifactRevisionKey,
    openTabs,
    resetGeneration,
    setCursorPosition,
    setMobilePrimaryPanel,
    setOpenTabs,
    setWorkspaceFocusMode,
    setActiveCenterTab,
    setSelectedFileLocation,
    setSelectedFilePath,
  ])
}
