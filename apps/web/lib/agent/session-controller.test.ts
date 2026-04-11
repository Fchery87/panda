import { describe, expect, it } from 'bun:test'
import { buildAgentPromptContext } from './session-controller'

describe('buildAgentPromptContext', () => {
  it('maps architect brainstorming state into planning session context', () => {
    const context = buildAgentPromptContext({
      projectId: 'project-1' as never,
      chatId: 'chat-1' as never,
      userId: 'user-1' as never,
      mode: 'architect',
      provider: 'openai',
      previousMessages: [],
      userContent: 'Help me plan',
      architectBrainstormEnabled: true,
    })

    expect(context.planningSession).toEqual({
      hasActiveSession: true,
      phase: 'discovery',
      hasDraftPlan: false,
    })
  })

  it('maps architect draft plan state into planning session context', () => {
    const context = buildAgentPromptContext({
      projectId: 'project-1' as never,
      chatId: 'chat-1' as never,
      userId: 'user-1' as never,
      mode: 'architect',
      provider: 'openai',
      previousMessages: [],
      userContent: 'Help me plan',
      planDraft: '## Draft\n- step',
    })

    expect(context.planningSession).toEqual({
      hasActiveSession: true,
      phase: 'validated_plan',
      hasDraftPlan: true,
    })
  })
})
