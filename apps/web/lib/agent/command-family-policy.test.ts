import { describe, expect, test } from 'bun:test'

import {
  getAllowedUserCommandFamilyDecisions,
  isCommandFamilyPreferenceWithinAdminCeiling,
  mergeCommandFamilyPolicy,
  normalizeCommandFamilyPolicy,
} from './command-family-policy'

import type { CommandFamilyPolicyEntry } from './command-family-policy'

describe('command-family policy helpers', () => {
  test('normalizes missing families with safe defaults', () => {
    const normalized = normalizeCommandFamilyPolicy([{ family: 'network', decision: 'deny' }])

    expect(normalized.map((entry) => entry.family)).toEqual([
      'package-manager',
      'network',
      'git',
      'destructive',
      'remote-exec',
      'filesystem-write',
      'unknown',
    ])
    expect(normalized.find((entry) => entry.family === 'network')?.decision).toBe('deny')
    expect(normalized.find((entry) => entry.family === 'remote-exec')?.decision).toBe('ask')
  })

  test('limits user preferences to decisions equal to or stricter than admin ceiling', () => {
    expect(getAllowedUserCommandFamilyDecisions('allow')).toEqual(['allow', 'ask', 'deny'])
    expect(getAllowedUserCommandFamilyDecisions('ask')).toEqual(['ask', 'deny'])
    expect(getAllowedUserCommandFamilyDecisions('deny')).toEqual(['deny'])

    expect(
      isCommandFamilyPreferenceWithinAdminCeiling({
        adminDecision: 'ask',
        userDecision: 'allow',
      })
    ).toBe(false)
    expect(
      isCommandFamilyPreferenceWithinAdminCeiling({
        adminDecision: 'ask',
        userDecision: 'deny',
      })
    ).toBe(true)
  })

  test('merges effective policy without allowing user preferences to loosen admin policy', () => {
    const adminPolicy: CommandFamilyPolicyEntry[] = [
      { family: 'network', decision: 'ask' },
      { family: 'git', decision: 'allow' },
      { family: 'remote-exec', decision: 'deny' },
    ]

    const effective = mergeCommandFamilyPolicy({
      adminPolicy,
      userPreferences: [
        { family: 'network', decision: 'allow' },
        { family: 'git', decision: 'deny' },
        { family: 'remote-exec', decision: 'ask' },
      ],
    })

    expect(effective.find((entry) => entry.family === 'network')?.decision).toBe('ask')
    expect(effective.find((entry) => entry.family === 'git')?.decision).toBe('deny')
    expect(effective.find((entry) => entry.family === 'remote-exec')?.decision).toBe('deny')
  })
})
