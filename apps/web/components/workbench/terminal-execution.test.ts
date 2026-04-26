import { describe, expect, test } from 'bun:test'

import {
  createLocalTerminalJob,
  getTerminalRunningCount,
  mergeTerminalJobs,
} from './terminal-execution'

describe('terminal WebContainer execution helpers', () => {
  test('creates a local terminal job that does not require a Convex id', () => {
    const job = createLocalTerminalJob('npm test', 1000)

    expect(job._id).toStartWith('local_')
    expect(job.command).toBe('npm test')
    expect(job.status).toBe('running')
    expect(job.logs).toEqual(['[1970-01-01T00:00:01.000Z] Running locally: npm test'])
  })

  test('shows local WebContainer jobs before persisted Convex jobs', () => {
    const localJob = createLocalTerminalJob('npm test', 1000)
    const persistedJob = {
      _id: 'job_1',
      _creationTime: 900,
      projectId: 'project_1',
      type: 'cli',
      status: 'completed',
      command: 'pwd',
      createdAt: 900,
    } as never

    expect(mergeTerminalJobs([persistedJob], [localJob]).map((job) => job.command)).toEqual([
      'npm test',
      'pwd',
    ])
  })

  test('counts running local and persisted jobs together', () => {
    const localJob = createLocalTerminalJob('npm test', 1000)
    const persistedJob = {
      _id: 'job_1',
      _creationTime: 900,
      projectId: 'project_1',
      type: 'cli',
      status: 'running',
      command: 'pwd',
      createdAt: 900,
    } as never

    expect(getTerminalRunningCount([localJob, persistedJob])).toBe(2)
  })
})
