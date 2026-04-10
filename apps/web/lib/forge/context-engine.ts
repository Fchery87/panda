import type { DecisionLogEntry, ForgeProjectSnapshot, ForgeRole, WorkerContextPack } from './types'

function requireTask(snapshot: ForgeProjectSnapshot, taskId: string) {
  const task = snapshot.taskBoard.tasks.find((candidate) => candidate.id === taskId)
  if (!task) {
    throw new Error(`Forge task not found: ${taskId}`)
  }

  return task
}

function getTaskDecisions(snapshot: ForgeProjectSnapshot, taskId: string): DecisionLogEntry[] {
  return [...snapshot.decisions]
    .filter((entry) => entry.relatedTaskIds.includes(taskId))
    .sort((left, right) => left.createdAt - right.createdAt)
}

function trimTrailingPeriod(value: string): string {
  return value.replace(/[.]+$/u, '')
}

export function buildRecentChangesDigest(args: {
  snapshot: ForgeProjectSnapshot
  taskId: string
}): string {
  const decisions = getTaskDecisions(args.snapshot, args.taskId)
  const latestDecision = decisions.at(-1)?.summary
  const latestVerification = [...args.snapshot.verification.records]
    .filter((record) => record.taskId === args.taskId)
    .sort((left, right) => right.updatedAt - left.updatedAt)[0]?.label
  const latestReview = args.snapshot.verification.latestReview?.summary

  const changes = [latestDecision, latestVerification, latestReview]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map(trimTrailingPeriod)

  return changes.length > 0
    ? `Recent task changes: ${changes.join('. ')}.`
    : 'Recent task changes: none recorded yet.'
}

export function buildNextStepBrief(args: {
  snapshot: ForgeProjectSnapshot
  taskId: string
}): string {
  const task = requireTask(args.snapshot, args.taskId)
  const explicitBrief = args.snapshot.state.summary.nextStepBrief?.trim()

  if (explicitBrief) {
    return `Next: ${explicitBrief}`
  }

  return `Next: Advance ${task.taskKey} toward ${task.ownerRole} completion.`
}

export function buildExcludedContext(args: {
  snapshot: ForgeProjectSnapshot
  taskId: string
}): string[] {
  const unrelatedTasks = args.snapshot.taskBoard.tasks
    .filter((task) => task.id !== args.taskId)
    .sort((left, right) => left.createdAt - right.createdAt)
    .map((task) => `Task ${task.taskKey}: ${task.title}`)

  const unrelatedDecisions = [...args.snapshot.decisions]
    .filter((entry) => !entry.relatedTaskIds.includes(args.taskId))
    .sort((left, right) => left.createdAt - right.createdAt)
    .map((entry) => `Decision ${entry.id}: ${entry.summary}`)

  return [...unrelatedTasks, ...unrelatedDecisions]
}

export function buildWorkerContextPack(args: {
  snapshot: ForgeProjectSnapshot
  taskId: string
  role: Extract<ForgeRole, 'builder' | 'manager' | 'executive'>
}): WorkerContextPack {
  const task = requireTask(args.snapshot, args.taskId)

  return {
    projectId: args.snapshot.project.id,
    deliveryStateId: args.snapshot.state.id,
    taskId: task.id,
    role: args.role,
    objective: task.title,
    summary: task.description,
    filesInScope: task.filesInScope,
    routesInScope: task.routesInScope,
    constraints: task.constraints,
    acceptanceCriteria: task.acceptanceCriteria,
    testRequirements: task.testRequirements,
    reviewRequirements: task.reviewRequirements,
    qaRequirements: task.qaRequirements,
    decisions: getTaskDecisions(args.snapshot, args.taskId),
    recentChangesDigest: buildRecentChangesDigest(args),
    nextStepBrief: buildNextStepBrief(args),
    excludedContext: buildExcludedContext(args),
  }
}
