'use client'

type TimelineSource = {
  _id: string
  summary: string
  createdAt: number
}

type DecisionSource = TimelineSource & {
  createdByRole?: string
}

type ReviewSource = TimelineSource & {
  reviewerRole?: string
}

export interface ForgeActivityEntry {
  kind: 'decision' | 'review' | 'qa' | 'ship'
  createdAt: number
  summary: string
  role?: string
}

export function buildForgeActivityTimeline(args: {
  decisions?: DecisionSource[]
  reviews?: ReviewSource[]
  qaReports?: TimelineSource[]
  shipReports?: TimelineSource[]
}): ForgeActivityEntry[] {
  return [
    ...(args.decisions ?? []).map((entry) => ({
      kind: 'decision' as const,
      createdAt: entry.createdAt,
      summary: entry.summary,
      role: entry.createdByRole,
    })),
    ...(args.reviews ?? []).map((entry) => ({
      kind: 'review' as const,
      createdAt: entry.createdAt,
      summary: entry.summary,
      role: entry.reviewerRole,
    })),
    ...(args.qaReports ?? []).map((entry) => ({
      kind: 'qa' as const,
      createdAt: entry.createdAt,
      summary: entry.summary,
    })),
    ...(args.shipReports ?? []).map((entry) => ({
      kind: 'ship' as const,
      createdAt: entry.createdAt,
      summary: entry.summary,
    })),
  ].sort((left, right) => right.createdAt - left.createdAt)
}
