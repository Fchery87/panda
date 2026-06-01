import { describe, expect, test } from 'bun:test'
import {
  getChatModeSurfacePresentation,
  getPrimaryChatModeSurfaceOptions,
  getAdvancedChatModeSurfaceOptions,
} from './chat-mode-surface'

describe('chat mode surface presentation', () => {
  test('maps architect mode to the Plan surface with explicit planning semantics', () => {
    expect(getChatModeSurfacePresentation('plan')).toMatchObject({
      label: 'Plan',
      shortLabel: 'Plan',
      description: 'Turn findings into a clear implementation plan before execution.',
      advanced: false,
    })
  })

  test('keeps ask as read-only Q&A and code as Agent Guided execution', () => {
    expect(getChatModeSurfacePresentation('ask')).toMatchObject({
      label: 'Ask',
      shortLabel: 'Ask',
      description: 'Research, explain, and answer without changing files.',
      advanced: false,
    })
    expect(getChatModeSurfacePresentation('code')).toMatchObject({
      label: 'Agent · Guided',
      shortLabel: 'Guided',
      description: 'Agent mode with review prompts before edits and commands.',
      advanced: false,
    })
  })

  test('exposes build as Agent Autopilot runtime presentation', () => {
    expect(getChatModeSurfacePresentation('build')).toMatchObject({
      label: 'Agent · Autopilot',
      shortLabel: 'Autopilot',
      description: 'Agent mode that applies safe changes and interrupts for risky actions.',
      advanced: false,
    })
  })

  test('exposes Ask, Plan, and Agent as primary picker options with no advanced section', () => {
    expect(getPrimaryChatModeSurfaceOptions().map((option) => option.label)).toEqual([
      'Ask',
      'Plan',
      'Agent',
    ])
    expect(getPrimaryChatModeSurfaceOptions().map((option) => option.mode)).toEqual([
      'ask',
      'plan',
      'code',
    ])
    expect(getAdvancedChatModeSurfaceOptions()).toEqual([])
  })

  test('returns fresh presentation objects so caller mutation does not leak', () => {
    const firstAsk = getChatModeSurfacePresentation('ask')
    firstAsk.label = 'Mutated'

    expect(getChatModeSurfacePresentation('ask')).toMatchObject({
      label: 'Ask',
      shortLabel: 'Ask',
    })

    const primaryOptions = getPrimaryChatModeSurfaceOptions()
    primaryOptions[0]!.label = 'Changed'

    expect(getPrimaryChatModeSurfaceOptions().map((option) => option.label)).toEqual([
      'Ask',
      'Plan',
      'Agent',
    ])
  })
})
