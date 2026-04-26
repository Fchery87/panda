import { describe, expect, test } from 'bun:test'

import { normalizeContainerCommand } from './process-adapter'

describe('normalizeContainerCommand', () => {
  test('translates bun commands to npm equivalents for WebContainer', () => {
    expect(normalizeContainerCommand('bun install')).toEqual({ command: 'npm', args: ['install'] })
    expect(normalizeContainerCommand('bun run dev')).toEqual({
      command: 'npm',
      args: ['run', 'dev'],
    })
  })
})
