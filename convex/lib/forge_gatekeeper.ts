import type { Doc } from '../_generated/dataModel'

const FORGE_TASK_TRANSITIONS: Record<
  Doc<'deliveryTasks'>['status'],
  Doc<'deliveryTasks'>['status'][]
> = {
  draft: ['planned'],
  planned: ['ready', 'in_progress'],
  ready: ['in_progress'],
  in_progress: ['blocked', 'in_review'],
  blocked: ['ready'],
  in_review: ['qa_pending', 'rejected'],
  qa_pending: ['done', 'rejected'],
  done: [],
  rejected: ['ready'],
}

const FORGE_PHASE_TRANSITIONS: Record<
  Doc<'deliveryStates'>['currentPhase'],
  Doc<'deliveryStates'>['currentPhase'][]
> = {
  intake: ['plan'],
  plan: ['execute'],
  execute: ['review'],
  review: ['qa'],
  qa: ['ship'],
  ship: ['execute'],
}

type ForgeTaskLike = Pick<Doc<'deliveryTasks'>, 'status' | 'evidence'> & {
  latestReview?: Pick<Doc<'reviewReports'>, 'type' | 'decision'> | null
  latestQa?: Pick<Doc<'qaReports'>, 'decision'> | null
}

export function assertForgeTaskTransition(args: {
  from: Doc<'deliveryTasks'>['status']
  to: Doc<'deliveryTasks'>['status']
}): void {
  if (args.from === args.to) {
    return
  }

  if (!FORGE_TASK_TRANSITIONS[args.from]?.includes(args.to)) {
    throw new Error(`Invalid forge task transition from ${args.from} to ${args.to}`)
  }
}

export function assertForgePhaseTransition(args: {
  from: Doc<'deliveryStates'>['currentPhase']
  to: Doc<'deliveryStates'>['currentPhase']
}): void {
  if (args.from === args.to) {
    return
  }

  if (!FORGE_PHASE_TRANSITIONS[args.from]?.includes(args.to)) {
    throw new Error(`Invalid forge phase transition from ${args.from} to ${args.to}`)
  }
}

export function assertForgeReviewGate(args: {
  task: ForgeTaskLike
  verificationRefs: string[]
}): void {
  assertForgeTaskTransition({ from: args.task.status, to: 'in_review' })

  const hasWorkerEvidence = args.task.evidence.some((entry) => entry.label.trim().length > 0)
  const hasVerificationRefs = args.verificationRefs.length > 0
  if (!hasWorkerEvidence || !hasVerificationRefs) {
    throw new Error(
      'Forge task requires worker evidence and verification refs before entering in_review'
    )
  }
}

export function assertForgeQaGate(args: {
  task: ForgeTaskLike
  reviewType?: Doc<'reviewReports'>['type']
  nextStatus?: Extract<Doc<'deliveryTasks'>['status'], 'qa_pending' | 'done'>
}): void {
  const nextStatus = args.nextStatus ?? 'qa_pending'
  assertForgeTaskTransition({ from: args.task.status, to: nextStatus })

  if (nextStatus === 'qa_pending') {
    const reviewType = args.reviewType ?? args.task.latestReview?.type
    if (reviewType !== 'implementation') {
      throw new Error('Forge task requires an implementation review before entering qa_pending')
    }
    return
  }

  const qaPassed = args.task.latestQa?.decision === 'pass'
  const qaWaived = args.task.evidence.some(
    (entry) => entry.type === 'qa_report' && /waiv/i.test(entry.label)
  )
  if (!qaPassed && !qaWaived) {
    throw new Error('Forge task requires QA pass or explicit waiver before entering done')
  }
}

export function assertForgeShipGate(args: {
  shipGateStatus: Doc<'deliveryStates'>['shipGateStatus']
  qaGateStatus: Doc<'deliveryStates'>['qaGateStatus']
  decision: Doc<'shipReports'>['decision']
}): void {
  if (args.decision === 'not_ready') {
    return
  }

  if (args.qaGateStatus !== 'passed') {
    throw new Error('Forge ship gate requires a passed QA gate')
  }

  if (args.shipGateStatus !== 'pending' && args.shipGateStatus !== 'waived') {
    throw new Error('Forge ship gate is not satisfied for a ready ship decision')
  }
}
