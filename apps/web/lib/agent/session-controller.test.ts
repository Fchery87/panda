import { describe, expect, it } from 'bun:test'
import { buildAgentPromptContext } from './session-controller'

describe('buildAgentPromptContext', () => {
  it('maps architect brainstorming state into planning session context', () => {
    const context = buildAgentPromptContext({
      projectId: 'project-1' as never,
      chatId: 'chat-1' as never,
      userId: 'user-1' as never,
      mode: 'plan',
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
      mode: 'plan',
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

  it('forwards activeSpec into PromptContext', () => {
    const spec = {
      id: 's1',
      version: 1,
      tier: 'explicit',
      status: 'executing',
      intent: { goal: 'test', rawMessage: 'test msg', constraints: [], acceptanceCriteria: [] },
      plan: { steps: [], dependencies: [], risks: [], estimatedTools: [] },
      validation: { preConditions: [], postConditions: [], invariants: [] },
      provenance: { model: 'test', promptHash: 'h', timestamp: 0, chatId: 'c1' },
      createdAt: 0,
      updatedAt: 0,
    } as any
    const context = buildAgentPromptContext({
      projectId: 'project-1' as never,
      chatId: 'chat-1' as never,
      userId: 'user-1' as never,
      mode: 'code',
      provider: 'openai',
      previousMessages: [],
      userContent: 'hi',
      activeSpec: spec,
    })
    expect(context.activeSpec).toBe(spec)
  })

  it('returns undefined activeSpec when not provided', () => {
    const context = buildAgentPromptContext({
      projectId: 'project-1' as never,
      chatId: 'chat-1' as never,
      userId: 'user-1' as never,
      mode: 'code',
      provider: 'openai',
      previousMessages: [],
      userContent: 'hi',
    })
    expect(context.activeSpec).toBeUndefined()
  })
})
