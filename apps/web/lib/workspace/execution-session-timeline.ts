import type {
  ExecutionSessionTone,
  ExecutionSessionViewModel,
} from './execution-session-view-model'

export type ExecutionSessionTimelineRowKind =
  | 'intent'
  | 'planning'
  | 'activity_group'
  | 'changed_work'
  | 'proof'
  | 'preview'
  | 'branches'
  | 'next_action'

export interface ExecutionSessionTimelineRow {
  id: string
  kind: ExecutionSessionTimelineRowKind
  title: string
  summary: string
  tone: ExecutionSessionTone
  detailRef?: { kind: 'plan' | 'run' | 'changes' | 'proof' | 'preview' | 'branches' }
  items?: Array<{ label: string; status: string; summary: string }>
}

export function buildExecutionSessionTimelineRows(
  session: ExecutionSessionViewModel | null
): ExecutionSessionTimelineRow[] {
  if (!session) {
    return [
      {
        id: 'intent',
        kind: 'intent',
        title: 'Start an execution session',
        summary: 'Describe a goal for Panda to plan, execute, prove, and continue.',
        tone: 'neutral',
      },
    ]
  }

  const rows: ExecutionSessionTimelineRow[] = [
    {
      id: 'intent',
      kind: 'intent',
      title: session.title,
      summary: session.statusLabel,
      tone: session.tone,
    },
  ]

  if (
    session.phase === 'planning' ||
    session.phase === 'approval' ||
    session.phase === 'ready_to_build'
  ) {
    rows.push({
      id: 'planning',
      kind: 'planning',
      title: session.phase === 'planning' ? 'Planning' : 'Plan',
      summary: session.summary,
      tone: session.tone,
      detailRef: { kind: 'plan' },
    })
  }

  if (session.proof.hasActiveRun) {
    rows.push({
      id: 'activity-run',
      kind: 'activity_group',
      title: 'Ran',
      summary: session.proof.detail,
      tone: 'progress',
      detailRef: { kind: 'run' },
    })
  }

  if (session.changedWork.needsReview) {
    const groups = session.changedWork.groups
    rows.push({
      id: 'changed-work',
      kind: 'changed_work',
      title: 'Changed',
      summary: groups
        ? `${session.changedWork.label} Created ${groups.created}, modified ${groups.modified}, deleted ${groups.deleted}.`
        : session.changedWork.label,
      tone: 'success',
      detailRef: { kind: 'changes' },
    })
  }

  rows.push(
    {
      id: 'proof',
      kind: 'proof',
      title: session.proof.label,
      summary: session.proof.detail,
      tone: session.proof.hasActiveRun ? 'progress' : session.tone,
      detailRef: { kind: 'proof' },
    },
    {
      id: 'preview',
      kind: 'preview',
      title: session.preview.label,
      summary: session.preview.detail,
      tone: session.preview.available ? 'success' : 'neutral',
      detailRef: { kind: 'preview' },
    }
  )

  if (session.branches.outcomes.length > 0) {
    rows.push({
      id: 'branches',
      kind: 'branches',
      title: 'Branches',
      summary: session.branches.label,
      tone: session.branches.blocked > 0 ? 'attention' : 'progress',
      detailRef: { kind: 'branches' },
      items: session.branches.outcomes.map((branch) => ({
        label: branch.label,
        status: branch.status,
        summary: branch.outcome,
      })),
    })
  }

  rows.push({
    id: 'next-action',
    kind: 'next_action',
    title: 'Next Action',
    summary: session.nextStep,
    tone: session.tone,
  })

  return rows
}
