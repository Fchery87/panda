import type { ForgeProjectSnapshot, ForgeTaskRecord } from './types'

export interface ForgeStatusView {
  primarySummary: string
  summaryLines: string[]
}

export interface ForgeTaskListItem {
  id: string
  title: string
  status: ForgeTaskRecord['status']
  ownerRole: ForgeTaskRecord['ownerRole']
}

export interface ForgeTaskView {
  openTasks: ForgeTaskListItem[]
  pendingReviews: ForgeTaskListItem[]
  qaBlockers: string[]
  shipBlockers: string[]
}

export interface ForgeVerificationView {
  reviewDecision: ForgeProjectSnapshot['verification']['latestReview'] extends infer T
    ? T extends { decision: infer D }
      ? D | null
      : null
    : null
  qaDecision: ForgeProjectSnapshot['verification']['latestQa'] extends infer T
    ? T extends { decision: infer D }
      ? D | null
      : null
    : null
  shipDecision: ForgeProjectSnapshot['verification']['latestShip'] extends infer T
    ? T extends { decision: infer D }
      ? D | null
      : null
    : null
  summaryLines: string[]
}

function toTaskListItem(task: ForgeTaskRecord): ForgeTaskListItem {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    ownerRole: task.ownerRole,
  }
}

export function buildForgeStatusView(args: { snapshot: ForgeProjectSnapshot }): ForgeStatusView {
  const { snapshot } = args
  const primarySummary =
    snapshot.verification.latestShip?.summary ??
    snapshot.state.summary.nextStepBrief ??
    'No next step recorded.'

  return {
    primarySummary,
    summaryLines: [
      `Phase ${snapshot.state.phase} is active for ${snapshot.state.activeRole}.`,
      `Open risks: ${snapshot.state.openRiskCount}.`,
      `Unresolved defects: ${snapshot.state.unresolvedDefectCount}.`,
      `Next step: ${primarySummary}`,
    ],
  }
}

export function buildForgeTaskView(args: { snapshot: ForgeProjectSnapshot }): ForgeTaskView {
  const { snapshot } = args
  const openTasks = snapshot.taskBoard.tasks.filter(
    (task) => task.status !== 'done' && task.status !== 'rejected'
  )
  const pendingReviews = snapshot.taskBoard.tasks.filter((task) => task.status === 'in_review')
  const qaBlockers = snapshot.taskBoard.tasks
    .filter((task) => task.status === 'qa_pending')
    .map((task) => task.title)

  const shipBlockers: string[] = []
  if (snapshot.state.gates.implementation_review !== 'passed') {
    shipBlockers.push('Implementation review gate is pending.')
  }
  if (snapshot.verification.latestQa && snapshot.verification.latestQa.decision !== 'pass') {
    shipBlockers.push(`Latest QA decision is ${snapshot.verification.latestQa.decision}.`)
  }

  return {
    openTasks: openTasks.map(toTaskListItem),
    pendingReviews: pendingReviews.map(toTaskListItem),
    qaBlockers,
    shipBlockers,
  }
}

export function buildForgeVerificationView(args: {
  snapshot: ForgeProjectSnapshot
}): ForgeVerificationView {
  const { snapshot } = args

  return {
    reviewDecision: snapshot.verification.latestReview?.decision ?? null,
    qaDecision: snapshot.verification.latestQa?.decision ?? null,
    shipDecision: snapshot.verification.latestShip?.decision ?? null,
    summaryLines: [
      `Latest review decision: ${snapshot.verification.latestReview?.decision ?? 'none'}.`,
      `Latest QA decision: ${snapshot.verification.latestQa?.decision ?? 'none'}.`,
      `Latest ship decision: ${snapshot.verification.latestShip?.decision ?? 'none'}.`,
    ],
  }
}
