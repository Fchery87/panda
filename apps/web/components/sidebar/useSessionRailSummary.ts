'use client'

import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import {
  buildSessionRailSummary,
  type RecentRunSummary,
  type SessionRailSummary,
} from './session-rail'

export function useSessionRailSummary(args: {
  projectId: Id<'projects'>
  activeChatId?: Id<'chats'>
  activeChatTitle?: string
  isStreaming: boolean
  pendingChangedFilesCount: number
}): SessionRailSummary {
  const recentRunSummaries = useQuery(api.agentRuns.listRecentSummariesByProject, {
    projectId: args.projectId,
    limit: 12,
  }) as RecentRunSummary[] | undefined

  return useMemo(
    () =>
      buildSessionRailSummary({
        runs: recentRunSummaries,
        activeChatId: args.activeChatId,
        activeChatTitle: args.activeChatTitle,
        isStreaming: args.isStreaming,
        pendingChangedFilesCount: args.pendingChangedFilesCount,
      }),
    [
      args.activeChatId,
      args.activeChatTitle,
      args.isStreaming,
      args.pendingChangedFilesCount,
      recentRunSummaries,
    ]
  )
}
