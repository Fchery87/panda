import { describe, expect, it } from 'bun:test'

import { resolveChatPanelVisibility } from './panelVisibility'

describe('resolveChatPanelVisibility', () => {
  it('hides plan and timeline inline by default', () => {
    expect(resolveChatPanelVisibility()).toEqual({
      showInlinePlanDraft: false,
      showInlineRunTimeline: false,
    })
  })

  it('shows timeline inline only when advanced debug is enabled', () => {
    expect(resolveChatPanelVisibility({ showAdvancedDebugInChat: true })).toEqual({
      showInlinePlanDraft: false,
      showInlineRunTimeline: true,
    })
  })
})
