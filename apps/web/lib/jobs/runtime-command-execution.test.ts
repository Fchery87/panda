import { describe, expect, test } from 'bun:test'

import { executeRuntimeCommand } from './runtime-command-execution'

describe('executeRuntimeCommand', () => {
  test('uses browser runtime when available and avoids the server route', async () => {
    let serverCalled = false
    const output = new ReadableStream<string>({
      start(controller) {
        controller.enqueue('local output')
        controller.close()
      },
    })

    const result = await executeRuntimeCommand({
      command: 'bun run test',
      webcontainer: {
        spawn: async () => ({ output, exit: Promise.resolve(0) }),
      } as never,
      serverExecute: async () => {
        serverCalled = true
        throw new Error('server route should not be used')
      },
    })

    expect(serverCalled).toBe(false)
    expect(result).toMatchObject({
      executionPath: 'browser-webcontainer',
      stdout: 'local output',
      stderr: '',
      exitCode: 0,
      timedOut: false,
    })
  })
})
