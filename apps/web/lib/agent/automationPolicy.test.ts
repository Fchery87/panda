import { describe, expect, it } from 'bun:test'
import {
  isCommandAllowedByPrefix,
  resolveEffectiveAgentPolicy,
  shouldAutoApplyArtifact,
  type AgentPolicy,
} from './automationPolicy'

describe('automationPolicy', () => {
  it('matches allowed command prefixes (trim + case-insensitive)', () => {
    expect(isCommandAllowedByPrefix('bun test', ['bun test'])).toBe(true)
    expect(isCommandAllowedByPrefix('BUN TEST', ['bun test'])).toBe(true)
    expect(isCommandAllowedByPrefix(' bun test  ', ['bun test'])).toBe(true)
    expect(isCommandAllowedByPrefix('bun test lib/foo.test.ts', ['bun test'])).toBe(true)
    expect(isCommandAllowedByPrefix('bunx eslint .', ['bun test'])).toBe(false)
  })

  it('resolves effective policy with project override over user defaults', () => {
    const defaults: AgentPolicy = {
      autoApplyFiles: false,
      autoRunCommands: false,
      allowedCommandPrefixes: ['bun test'],
    }

    expect(resolveEffectiveAgentPolicy({ projectPolicy: null, userDefaults: defaults })).toEqual(
      defaults
    )

    expect(
      resolveEffectiveAgentPolicy({
        projectPolicy: { autoApplyFiles: true, autoRunCommands: false, allowedCommandPrefixes: [] },
        userDefaults: defaults,
      })
    ).toEqual({ autoApplyFiles: true, autoRunCommands: false, allowedCommandPrefixes: [] })
  })

  it('decides whether to auto-apply artifacts based on policy', () => {
    const policy: AgentPolicy = {
      autoApplyFiles: true,
      autoRunCommands: true,
      allowedCommandPrefixes: ['bun test'],
    }

    expect(
      shouldAutoApplyArtifact(policy, {
        type: 'file_write',
        payload: { filePath: 'x.ts', content: 'export const x = 1\n' },
      })
    ).toBe(true)

    expect(
      shouldAutoApplyArtifact(policy, {
        type: 'command_run',
        payload: { command: 'bun test', workingDirectory: undefined },
      })
    ).toBe(true)

    expect(
      shouldAutoApplyArtifact(policy, {
        type: 'command_run',
        payload: { command: 'bunx eslint .', workingDirectory: undefined },
      })
    ).toBe(false)
  })
})
