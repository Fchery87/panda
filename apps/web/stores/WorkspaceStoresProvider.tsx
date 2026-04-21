'use client'

import { useEffect, type ReactNode } from 'react'

import type { Id } from '@convex/_generated/dataModel'

import { useChatSessionStore } from './chatSessionStore'
import { useEditorContextStore } from './editorContextStore'
import { useResponsiveLayoutSync } from './useResponsiveLayoutSync'

interface WorkspaceStoresProviderProps {
  projectId: Id<'projects'>
  children: ReactNode
}

export function WorkspaceStoresProvider({ projectId, children }: WorkspaceStoresProviderProps) {
  useResponsiveLayoutSync()

  useEffect(() => {
    useEditorContextStore.getState().reset()
    useChatSessionStore.getState().reset()
  }, [projectId])

  return <>{children}</>
}
