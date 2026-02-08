import { describe, expect, it } from 'bun:test'
import { getDiscussPrompt } from './prompt-library'

describe('prompt-library discuss brainstorming protocol', () => {
  it('injects brainstorming protocol instructions when enabled', () => {
    const messages = getDiscussPrompt({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'discuss',
      provider: 'openai',
      userMessage: 'help me plan',
      customInstructions: 'Discuss brainstorming protocol: enabled',
    })

    const systemText = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')

    expect(systemText).toContain('Brainstorm phase: discovery | options | validated_plan')
    expect(systemText).toContain('Ask exactly one clarifying question')
  })

  it('does not inject brainstorming protocol by default', () => {
    const messages = getDiscussPrompt({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'discuss',
      provider: 'openai',
      userMessage: 'help me plan',
    })

    const systemText = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')

    expect(systemText).not.toContain('Brainstorm phase: discovery | options | validated_plan')
  })

  it('allows concise direct answers for straightforward factual questions', () => {
    const messages = getDiscussPrompt({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'discuss',
      provider: 'openai',
      userMessage: 'what model are you?',
    })

    const systemText = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')

    expect(systemText).toContain('For straightforward factual questions')
    expect(systemText).toContain('Answer directly in plain language')
  })
})
