type ForgeTaskBoardStatus =
  | 'draft'
  | 'planned'
  | 'ready'
  | 'in_progress'
  | 'blocked'
  | 'in_review'
  | 'qa_pending'
  | 'done'
  | 'rejected'

type ForgeTaskBoardTask = {
  _id: string
  status: ForgeTaskBoardStatus
  dependencies?: string[]
  blockers?: string[]
  createdAt: number
  updatedAt: number
}

export type ForgeTaskReadiness = 'ready' | 'blocked' | 'done' | 'rejected'

export type ForgeTaskBoardMetadata = {
  readiness: ForgeTaskReadiness
  isReady: boolean
  blockedByTaskIds: string[]
  priority: number
}

type TaskWithBoard<TTask extends ForgeTaskBoardTask> = TTask & {
  taskBoard: ForgeTaskBoardMetadata
}

function isCompletedStatus(status: ForgeTaskBoardStatus): boolean {
  return status === 'done'
}

function isRejectedStatus(status: ForgeTaskBoardStatus): boolean {
  return status === 'rejected'
}

function deriveTaskPriority(status: ForgeTaskBoardStatus): number {
  switch (status) {
    case 'in_progress':
      return 0
    case 'ready':
      return 1
    case 'planned':
      return 2
    case 'draft':
      return 3
    case 'blocked':
    case 'in_review':
    case 'qa_pending':
      return 4
    case 'done':
      return 5
    case 'rejected':
      return 6
  }
}

export function deriveTaskReadiness<TTask extends ForgeTaskBoardTask>(args: {
  task: TTask
  tasks: TTask[]
}): Omit<ForgeTaskBoardMetadata, 'priority'> {
  if (isCompletedStatus(args.task.status)) {
    return {
      blockedByTaskIds: [],
      isReady: true,
      readiness: 'done',
    }
  }

  if (isRejectedStatus(args.task.status)) {
    return {
      blockedByTaskIds: [],
      isReady: false,
      readiness: 'rejected',
    }
  }

  const blockedByTaskIds = (args.task.dependencies ?? []).filter((dependencyId) => {
    const dependency = args.tasks.find((candidate) => candidate._id === dependencyId)
    return dependency ? !isCompletedStatus(dependency.status) : false
  })

  if (
    args.task.status === 'blocked' ||
    (args.task.blockers?.length ?? 0) > 0 ||
    blockedByTaskIds.length > 0
  ) {
    return {
      blockedByTaskIds,
      isReady: false,
      readiness: 'blocked',
    }
  }

  if (args.task.status === 'in_review' || args.task.status === 'qa_pending') {
    return {
      blockedByTaskIds: [],
      isReady: false,
      readiness: 'blocked',
    }
  }

  return {
    blockedByTaskIds: [],
    isReady: true,
    readiness: 'ready',
  }
}

export function selectActiveForgeTask<TTask extends ForgeTaskBoardTask>(args: {
  tasks: TTask[]
}): TaskWithBoard<TTask> | null {
  const boardTasks = buildTaskBoardView(args).tasks
  return boardTasks[0] ?? null
}

export function buildTaskBoardView<TTask extends ForgeTaskBoardTask>(args: {
  tasks: TTask[]
}): {
  activeTaskId?: string
  tasks: TaskWithBoard<TTask>[]
} {
  const tasksWithBoard = args.tasks
    .map((task) => {
      const readiness = deriveTaskReadiness({ task, tasks: args.tasks })
      return {
        ...task,
        taskBoard: {
          ...readiness,
          priority: deriveTaskPriority(task.status),
        },
      }
    })
    .sort((left, right) => {
      if (left.taskBoard.priority !== right.taskBoard.priority) {
        return left.taskBoard.priority - right.taskBoard.priority
      }

      if (left.updatedAt !== right.updatedAt) {
        return left.updatedAt - right.updatedAt
      }

      return left.createdAt - right.createdAt
    })

  return {
    activeTaskId: tasksWithBoard[0]?._id,
    tasks: tasksWithBoard,
  }
}
