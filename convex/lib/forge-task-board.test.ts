import { describe, expect, test } from 'bun:test'
import { buildTaskBoardView, deriveTaskReadiness, selectActiveForgeTask } from './forge_task_board'

type TestTask = {
  _id: string
  taskKey: string
  title: string
  status:
    | 'draft'
    | 'planned'
    | 'ready'
    | 'in_progress'
    | 'blocked'
    | 'in_review'
    | 'qa_pending'
    | 'done'
    | 'rejected'
  dependencies: string[]
  blockers: string[]
  createdAt: number
  updatedAt: number
}

function makeTask(overrides: Partial<TestTask> = {}): TestTask {
  return {
    _id: 'task-1',
    taskKey: 'task-1',
    title: 'Task 1',
    status: 'ready',
    dependencies: [],
    blockers: [],
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  }
}

describe('forge task board derivation', () => {
  test('marks a task blocked when dependencies are unfinished', () => {
    const tasks = [
      makeTask({ _id: 'task-a', taskKey: 'task-a', status: 'in_progress' }),
      makeTask({ _id: 'task-b', taskKey: 'task-b', dependencies: ['task-a'] }),
    ]

    expect(deriveTaskReadiness({ task: tasks[1], tasks })).toEqual({
      blockedByTaskIds: ['task-a'],
      isReady: false,
      readiness: 'blocked',
    })
  })

  test('treats review and qa pending tasks as non-ready workflow states', () => {
    const reviewTask = makeTask({ _id: 'task-review', taskKey: 'task-review', status: 'in_review' })
    const qaTask = makeTask({ _id: 'task-qa', taskKey: 'task-qa', status: 'qa_pending' })

    expect(deriveTaskReadiness({ task: reviewTask, tasks: [reviewTask] })).toEqual({
      blockedByTaskIds: [],
      isReady: false,
      readiness: 'blocked',
    })
    expect(deriveTaskReadiness({ task: qaTask, tasks: [qaTask] })).toEqual({
      blockedByTaskIds: [],
      isReady: false,
      readiness: 'blocked',
    })
  })

  test('selects the highest-priority ready task instead of the first array item', () => {
    const tasks = [
      makeTask({ _id: 'task-blocked', taskKey: 'task-blocked', dependencies: ['task-done'] }),
      makeTask({ _id: 'task-done', taskKey: 'task-done', status: 'done' }),
      makeTask({ _id: 'task-in-progress', taskKey: 'task-in-progress', status: 'in_progress' }),
      makeTask({ _id: 'task-ready', taskKey: 'task-ready', status: 'ready' }),
    ]

    expect(selectActiveForgeTask({ tasks })?._id).toBe('task-in-progress')
  })

  test('breaks ties deterministically by status and timestamps', () => {
    const tasks = [
      makeTask({
        _id: 'task-newer',
        taskKey: 'task-newer',
        status: 'ready',
        createdAt: 200,
        updatedAt: 200,
      }),
      makeTask({
        _id: 'task-older',
        taskKey: 'task-older',
        status: 'ready',
        createdAt: 100,
        updatedAt: 100,
      }),
    ]

    const board = buildTaskBoardView({ tasks })

    expect(board.activeTaskId).toBe('task-older')
    expect(board.tasks.map((task) => task._id)).toEqual(['task-older', 'task-newer'])
    expect(board.tasks[0]?.taskBoard.readiness).toBe('ready')
  })
})
