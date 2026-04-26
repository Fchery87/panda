import { describe, expect, it } from 'bun:test'
import { bootWebcontainerWithTimeout } from './boot'

describe('bootWebcontainerWithTimeout', () => {
  it('rejects when WebContainer boot does not settle before the timeout', async () => {
    await expect(
      bootWebcontainerWithTimeout({
        boot: () => new Promise(() => {}),
        timeoutMs: 1,
      })
    ).rejects.toThrow('WebContainer boot timed out after 1ms')
  })
})
