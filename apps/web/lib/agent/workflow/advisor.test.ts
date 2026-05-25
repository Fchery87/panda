import { describe, expect, test } from 'bun:test'
import { resolveAdvisorGates, summarizeAdvisorRequirement } from './advisor'

describe('advisor policy gates', () => {
  test('detects risky changed files and commands', () => {
    const gates = resolveAdvisorGates({
      changedFiles: ['convex/schema.ts', 'apps/web/lib/auth/session.ts', 'package.json'],
      commands: ['rm -rf tmp'],
      autonomy: 'autopilot',
      diffFileCount: 9,
    })

    expect(gates).toContain('large_diff')
    expect(gates).toContain('dependency_change')
    expect(gates).toContain('auth_or_security_change')
    expect(gates).toContain('database_schema_change')
    expect(gates).toContain('destructive_command')
    expect(gates).toContain('autopilot_checkpoint')
  })

  test('requires advisor only when enabled and matching configured gates', () => {
    expect(
      summarizeAdvisorRequirement(
        { enabled: true, requiredFor: ['auth_or_security_change'], reasoningEffort: 'high' },
        { changedFiles: ['apps/web/lib/auth/session.ts'] }
      ).required
    ).toBe(true)

    expect(
      summarizeAdvisorRequirement(
        { enabled: false, requiredFor: ['auth_or_security_change'], reasoningEffort: 'high' },
        { changedFiles: ['apps/web/lib/auth/session.ts'] }
      ).required
    ).toBe(false)
  })
})
