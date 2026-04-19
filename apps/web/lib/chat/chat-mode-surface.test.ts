import { describe, expect, test } from 'bun:test'
import {
  getChatModeSurfacePresentation,
  getPrimaryChatModeSurfaceOptions,
  getAdvancedChatModeSurfaceOptions,
} from './chat-mode-surface'

describe('chat mode surface presentation', () => {
  test('maps architect mode to the Plan surface with explicit planning semantics', () => {
    expect(getChatModeSurfacePresentation('architect')).toMatchObject({
      label: 'Plan',
      shortLabel: 'Plan',
      description: 'Clarify scope, draft the plan, and get approval before execution.',
      advanced: false,
    })
  })

  test('keeps ask as read-only Q&A and code as coordinated Code execution', () => {
    expect(getChatModeSurfacePresentation('ask')).toMatchObject({
      label: 'Ask',
      shortLabel: 'Ask',
      description: 'Read-only Q&A without touching files or running changes.',
      advanced: false,
    })
    expect(getChatModeSurfacePresentation('code')).toMatchObject({
      label: 'Code',
      shortLabel: 'Code',
      description: 'Execute code changes directly with read, write, and command access.',
      advanced: false,
    })
  })

  test('keeps build visible through an advanced-only direct execution presentation', () => {
    expect(getChatModeSurfacePresentation('build')).toMatchObject({
      label: 'Build',
      shortLabel: 'Build',
      description: 'Full-access mode for direct expert execution of complex tasks.',
      advanced: true,
    })
  })

  test('exposes Plan and Code as the primary picker options and Build as advanced', () => {
    expect(getPrimaryChatModeSurfaceOptions().map((option) => option.label)).toEqual([
      'Plan',
      'Code',
    ])
    expect(getAdvancedChatModeSurfaceOptions().map((option) => option.label)).toEqual(['Build'])
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
      'Plan',
      'Code',
    ])
  })
})
