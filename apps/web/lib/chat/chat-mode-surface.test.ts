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

  test('keeps ask as read-only Q&A and code as coordinated Build execution', () => {
    expect(getChatModeSurfacePresentation('ask')).toMatchObject({
      label: 'Ask',
      shortLabel: 'Ask',
      description: 'Read-only Q&A without touching files or running changes.',
      advanced: false,
    })
    expect(getChatModeSurfacePresentation('code')).toMatchObject({
      label: 'Build',
      shortLabel: 'Build',
      description: 'Execute an approved plan with coordinated delivery across the workspace.',
      advanced: false,
    })
  })

  test('keeps builder visible through an advanced-only direct execution presentation', () => {
    expect(getChatModeSurfacePresentation('build')).toMatchObject({
      label: 'Builder',
      shortLabel: 'Bldr',
      description: 'Direct expert execution when you want the specialist to do the work.',
      advanced: true,
    })
  })

  test('exposes Plan and Build as the primary picker options and Builder as advanced', () => {
    expect(getPrimaryChatModeSurfaceOptions().map((option) => option.label)).toEqual([
      'Plan',
      'Build',
    ])
    expect(getAdvancedChatModeSurfaceOptions().map((option) => option.label)).toEqual(['Builder'])
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
      'Build',
    ])
  })
})
