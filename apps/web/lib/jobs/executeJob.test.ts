import { describe, expect, it } from 'bun:test'
import { executeQueuedJob } from './executeJob'

const originalFetch = global.fetch

describe('executeQueuedJob', () => {
  it('marks the job running before execution and completed after success', async () => {
    const statusCalls: Array<[string, string, Record<string, unknown> | undefined]> = []
    const updateJobStatus = async (
      jobId: string,
      status: string,
      updates?: Record<string, unknown>
    ) => {
      statusCalls.push([jobId, status, updates])
    }
    global.fetch = (async () =>
      new Response(
        JSON.stringify({
          stdout: 'done',
          stderr: '',
          exitCode: 0,
          durationMs: 12,
          timedOut: false,
        })
      )) as typeof fetch

    try {
      const result = await executeQueuedJob({
        jobId: 'job_1' as never,
        command: 'pwd',
        updateJobStatus: updateJobStatus as never,
      })

      expect(result.exitCode).toBe(0)
      expect(statusCalls[0]?.[0]).toBe('job_1')
      expect(statusCalls[0]?.[1]).toBe('running')
      expect(String(statusCalls[0]?.[2]?.logs)).toContain('Running: pwd')
      expect(statusCalls[1]?.[1]).toBe('completed')
      expect(statusCalls[1]?.[2]?.output).toBe('done')
    } finally {
      global.fetch = originalFetch
    }
  })

  it('marks the job failed when the execute route returns an error response', async () => {
    const statusCalls: Array<[string, string, Record<string, unknown> | undefined]> = []
    const updateJobStatus = async (
      jobId: string,
      status: string,
      updates?: Record<string, unknown>
    ) => {
      statusCalls.push([jobId, status, updates])
    }
    global.fetch = (async () => new Response('execution failed', { status: 500 })) as typeof fetch

    try {
      await expect(
        executeQueuedJob({
          jobId: 'job_2' as never,
          command: 'pwd',
          updateJobStatus: updateJobStatus as never,
        })
      ).rejects.toThrow('execution failed')

      expect(statusCalls[0]?.[1]).toBe('running')
      expect(statusCalls[1]?.[1]).toBe('failed')
      expect(statusCalls[1]?.[2]?.error).toBe('execution failed')
    } finally {
      global.fetch = originalFetch
    }
  })

  it('runs inside WebContainer through the same job lifecycle without touching the server route', async () => {
    const statusCalls: Array<[string, string, Record<string, unknown> | undefined]> = []
    let fetchCalled = false
    global.fetch = (async () => {
      fetchCalled = true
      return new Response('{}')
    }) as typeof fetch

    const output = new ReadableStream<string>({
      start(controller) {
        controller.enqueue('local output')
        controller.close()
      },
    })
    const webcontainer = {
      spawn: async () => ({
        output,
        exit: Promise.resolve(0),
      }),
    }

    try {
      const result = await executeQueuedJob({
        jobId: 'job_3' as never,
        command: 'bun run test',
        updateJobStatus: (async (
          jobId: string,
          status: string,
          updates?: Record<string, unknown>
        ) => {
          statusCalls.push([jobId, status, updates])
        }) as never,
        webcontainer: webcontainer as never,
      })

      expect(result).toMatchObject({
        stdout: 'local output',
        stderr: '',
        exitCode: 0,
        timedOut: false,
      })
      expect(statusCalls[0]?.[0]).toBe('job_3')
      expect(statusCalls[0]?.[1]).toBe('running')
      expect(String(statusCalls[0]?.[2]?.logs)).toContain('Running: bun run test')
      expect(statusCalls[1]?.[1]).toBe('completed')
      expect(statusCalls[1]?.[2]?.output).toBe('local output')
      expect(fetchCalled).toBe(false)
    } finally {
      global.fetch = originalFetch
    }
  })
})
