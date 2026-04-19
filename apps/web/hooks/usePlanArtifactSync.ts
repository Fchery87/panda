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

type MobilePrimaryPanel = 'workspace' | 'chat' | 'review'

interface UsePlanArtifactSyncArgs {
  activePlanArtifact: GeneratedPlanArtifact | null | undefined
  openTabs: OpenTab[]
  setOpenTabs: React.Dispatch<React.SetStateAction<OpenTab[]>>
  setSelectedFilePath: (path: string | null) => void
  setSelectedFileLocation: (loc: FileLocation) => void
  setCursorPosition: (pos: CursorPosition) => void
  setMobilePrimaryPanel: (panel: MobilePrimaryPanel) => void
}

export function usePlanArtifactSync({
  activePlanArtifact,
  openTabs: _openTabs,
  setOpenTabs,
  setSelectedFilePath,
  setSelectedFileLocation,
  setCursorPosition,
  setMobilePrimaryPanel,
}: UsePlanArtifactSyncArgs) {
  const lastOpenedPlanArtifactRef = useRef<string | null>(null)
  const lastSyncedPlanArtifactRef = useRef<string | null>(null)

  const activePlanArtifactOpenKey = activePlanArtifact
    ? `${activePlanArtifact.sessionId}:${activePlanArtifact.generatedAt}`
    : null
  const activePlanArtifactRevisionKey = activePlanArtifact
    ? `${activePlanArtifact.sessionId}:${activePlanArtifact.generatedAt}:${activePlanArtifact.status}`
    : null

  useEffect(() => {
    if (!activePlanArtifact || !activePlanArtifactOpenKey || !activePlanArtifactRevisionKey) return
    if (lastSyncedPlanArtifactRef.current === activePlanArtifactRevisionKey) return

    const nextPlanTab = createPlanArtifactWorkspaceTab(activePlanArtifact)

    setOpenTabs((prev) => upsertPlanArtifactWorkspaceTab(prev, activePlanArtifact))
    lastSyncedPlanArtifactRef.current = activePlanArtifactRevisionKey

    if (lastOpenedPlanArtifactRef.current !== activePlanArtifactOpenKey) {
      setSelectedFilePath(nextPlanTab.path)
      setSelectedFileLocation(null)
      setCursorPosition(null)
      setMobilePrimaryPanel('workspace')
      lastOpenedPlanArtifactRef.current = activePlanArtifactOpenKey
    }
  }, [
    activePlanArtifact,
    activePlanArtifactOpenKey,
    activePlanArtifactRevisionKey,
    setCursorPosition,
    setMobilePrimaryPanel,
    setOpenTabs,
    setSelectedFileLocation,
    setSelectedFilePath,
  ])
}
