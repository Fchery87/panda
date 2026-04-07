import { describe, expect, test } from 'bun:test'
import {
  getChatModeSurfacePresentation,
  getPrimaryChatModeSurfaceOptions,
  getAdvancedChatModeSurfaceOptions,
} from './chat-mode-surface'

describe('chat mode surface presentation', () => {
  test('maps architect mode to the beginner-friendly Plan surface', () => {
    expect(getChatModeSurfacePresentation('architect')).toMatchObject({
      label: 'Plan',
      shortLabel: 'Plan',
      advanced: false,
    })
  })

  test('maps ask and code modes to the default Build surface', () => {
    expect(getChatModeSurfacePresentation('ask')).toMatchObject({
      label: 'Build',
      shortLabel: 'Build',
      advanced: false,
    })
    expect(getChatModeSurfacePresentation('code')).toMatchObject({
      label: 'Build',
      shortLabel: 'Build',
      advanced: false,
    })
  })

  test('keeps builder visible through an advanced-only presentation', () => {
    expect(getChatModeSurfacePresentation('build')).toMatchObject({
      label: 'Builder',
      shortLabel: 'Bldr',
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
})
