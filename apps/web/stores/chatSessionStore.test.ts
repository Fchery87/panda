import { describe, expect, test } from 'bun:test'

import { useChatSessionStore } from './chatSessionStore'

describe('chatSessionStore', () => {
  const resetStore = () => {
    useChatSessionStore.getState().reset()
  }

  test('default mode is plan', () => {
    resetStore()
    expect(useChatSessionStore.getState().chatMode).toBe('plan')
  })

  test('changing chat clears the active model selection', () => {
    resetStore()
    const state = useChatSessionStore.getState()

    state.setUiSelectedModel({ modelId: 'claude-opus-4-7' })
    state.setActiveChatId('chat_abc' as never)

    expect(useChatSessionStore.getState().uiSelectedModel).toBeNull()
  })

  test('oversight level toggles between review and autopilot', () => {
    resetStore()
    const state = useChatSessionStore.getState()

    expect(state.oversightLevel).toBe('review')
    state.setOversightLevel('autopilot')

    expect(useChatSessionStore.getState().oversightLevel).toBe('autopilot')
  })

  test('auto mode switch policy defaults to auto and can be changed', () => {
    resetStore()
    const state = useChatSessionStore.getState()

    expect(state.autoModeSwitchPolicy).toBe('auto')
    state.setAutoModeSwitchPolicy('suggest')

    expect(useChatSessionStore.getState().autoModeSwitchPolicy).toBe('suggest')
  })
})
