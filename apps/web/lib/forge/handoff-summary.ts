import type { ForgeProjectSnapshot, ForgeRole, ForgeTaskRecord } from './types'

export interface ForgeHandoffSummary {
  activeTask: Pick<ForgeTaskRecord, 'id' | 'title' | 'status' | 'ownerRole'> | null
  openTaskCount: number
  summaryLines: string[]
}

export interface ForgeRoleActionView {
  role: ForgeRole
  items: string[]
}

export interface ForgeRoleNextActions {
  builder: ForgeRoleActionView
  manager: ForgeRoleActionView
  executive: ForgeRoleActionView
}

function getActiveTask(snapshot: ForgeProjectSnapshot): ForgeTaskRecord | null {
  const activeTaskId = snapshot.taskBoard.activeTaskId
  if (activeTaskId) {
    const activeTask = snapshot.taskBoard.tasks.find((task) => task.id === activeTaskId)
    if (activeTask) return activeTask
  }

  return snapshot.taskBoard.tasks[0] ?? null
}

function getOpenTasks(snapshot: ForgeProjectSnapshot): ForgeTaskRecord[] {
  return snapshot.taskBoard.tasks.filter(
    (task) => task.status !== 'done' && task.status !== 'rejected'
  )
}

export function buildForgeHandoffSummary(args: {
  snapshot: ForgeProjectSnapshot
}): ForgeHandoffSummary {
  const { snapshot } = args
  const activeTask = getActiveTask(snapshot)
  const openTasks = getOpenTasks(snapshot)

  return {
    activeTask: activeTask
      ? {
          id: activeTask.id,
          title: activeTask.title,
          status: activeTask.status,
          ownerRole: activeTask.ownerRole,
        }
      : null,
    openTaskCount: openTasks.length,
    summaryLines: [
      `Goal: ${snapshot.state.summary.goal}`,
      `Phase: ${snapshot.state.phase}`,
      `Active role: ${snapshot.state.activeRole}`,
      `Active task: ${activeTask?.title ?? 'None'}`,
      `Next step: ${snapshot.state.summary.nextStepBrief ?? 'No next step recorded.'}`,
    ],
  }
}

export function buildRoleNextActions(args: {
  snapshot: ForgeProjectSnapshot
}): ForgeRoleNextActions {
  const { snapshot } = args
  const activeTask = getActiveTask(snapshot)
  const blockedTask = snapshot.taskBoard.tasks.find((task) => task.status === 'blocked')
  const latestReview = snapshot.verification.latestReview
  const latestQa = snapshot.verification.latestQa

  return {
    builder: {
      role: 'builder',
      items: blockedTask
        ? [`Unblock "${blockedTask.title}" after the manager handoff.`]
        : ['No builder follow-up is currently blocked.'],
    },
    manager: {
      role: 'manager',
      items: [
        activeTask
          ? `Advance "${activeTask.title}" toward implementation review.`
          : 'Select the next task to advance.',
        ...(latestReview?.requiredActionItems ?? []),
      ],
    },
    executive: {
      role: 'executive',
      items:
        latestQa && latestQa.decision !== 'pass'
          ? ['Do not approve ship while review and QA concerns remain unresolved.']
          : ['Review ship readiness once QA passes.'],
    },
  }
}
