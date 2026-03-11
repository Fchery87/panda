import { describe, expect, it } from 'bun:test'
import { getPromptForMode, normalizeChatMode } from './prompt-library'

// Helper: extract all system message text from a getPromptForMode result
function getSystemText(
  mode: Parameters<typeof getPromptForMode>[0]['chatMode'],
  extra?: Partial<Parameters<typeof getPromptForMode>[0]>
) {
  const messages = getPromptForMode({
    projectId: 'p',
    chatId: 'c',
    userId: 'u',
    chatMode: mode,
    provider: 'openai',
    userMessage: 'help me',
    ...extra,
  })
  return messages
    .filter((m): m is { role: 'system'; content: string } => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n')
}

describe('prompt-library — natural flow (INTENT RULES)', () => {
  it('ASK mode: instructs conversational responses, no planning preamble', () => {
    const text = getSystemText('ask')
    expect(text).toContain('INTENT RULES')
    expect(text).toContain('NEVER open with a plan')
    expect(text).toContain('No preamble')
  })

  it('ARCHITECT mode: structured plan only for explicit planning requests', () => {
    const text = getSystemText('architect')
    expect(text).toContain('INTENT RULES')
    expect(text).toContain('ONLY THEN produce or update the plan artifact')
    expect(text).toContain('respond naturally in paragraphs')
    expect(text).toContain('Relevant Files')
    expect(text).toContain('Implementation Plan')
    expect(text).toContain('Validation')
  })

  it('CODE mode: quiet execution — no planning preamble, all code via tools', () => {
    const text = getSystemText('code')
    expect(text).toContain('INTENT RULES')
    expect(text).toContain('Do NOT produce a planning preamble')
    expect(text).toContain('All code goes through tools')
  })

  it('BUILD mode: quiet execution mode, no clarifying questions upfront', () => {
    const text = getSystemText('build')
    expect(text).toContain('INTENT RULES')
    expect(text).toContain('Quiet Execution Mode')
    expect(text).toContain('Do NOT produce a planning preamble')
  })
})

describe('prompt-library — legacy mode normalization', () => {
  it('maps discuss to architect', () => {
    expect(normalizeChatMode('discuss', 'code')).toBe('architect')
  })

  it('maps debug to code and review to ask', () => {
    expect(normalizeChatMode('debug', 'ask')).toBe('code')
    expect(normalizeChatMode('review', 'code')).toBe('ask')
  })
})

describe('prompt-library — architect brainstorming protocol', () => {
  it('injects brainstorming protocol instructions when enabled', () => {
    const messages = getPromptForMode({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'architect',
      provider: 'openai',
      userMessage: 'help me plan',
      customInstructions: 'Architect brainstorming protocol: enabled',
    })

    const systemText = messages
      .filter((m): m is { role: 'system'; content: string } => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')

    expect(systemText).toContain('Brainstorm phase: discovery | options | validated_plan')
    expect(systemText).toContain('Ask exactly one clarifying question')
  })

  it('does not inject brainstorming protocol by default', () => {
    const messages = getPromptForMode({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'architect',
      provider: 'openai',
      userMessage: 'help me plan',
    })

    const systemText = messages
      .filter((m): m is { role: 'system'; content: string } => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')

    expect(systemText).not.toContain('Brainstorm phase: discovery | options | validated_plan')
  })

  it('allows concise direct answers for straightforward factual questions', () => {
    const messages = getPromptForMode({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'architect',
      provider: 'openai',
      userMessage: 'what model are you?',
    })

    const systemText = messages
      .filter((m): m is { role: 'system'; content: string } => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')

    expect(systemText).toContain('For straightforward factual questions')
    expect(systemText).toContain('answer directly in plain language')
  })
})

describe('prompt-library — project overview integration', () => {
  it('includes project overview when provided', () => {
    const projectOverview = '## Project Overview\nStack: React, TypeScript\nTotal Files: 42'
    const messages = getPromptForMode({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'code',
      provider: 'openai',
      userMessage: 'help me',
      projectOverview,
    })

    const contextMessages = messages.filter(
      (m) => m.role === 'system' && m.content.includes('Project Overview')
    )
    expect(contextMessages.length).toBeGreaterThan(0)
    expect(contextMessages[0].content).toContain('## Project Overview')
    expect(contextMessages[0].content).toContain('Stack: React, TypeScript')
  })

  it('places overview before memory bank in output order', () => {
    const projectOverview = 'Project Overview Content'
    const memoryBank = 'Memory Bank Content'

    const messages = getPromptForMode({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'code',
      provider: 'openai',
      userMessage: 'help me',
      projectOverview,
      memoryBank,
    })

    const contextMessages = messages.filter(
      (m) => m.role === 'system' && m.content.includes('## Project')
    )
    expect(contextMessages.length).toBeGreaterThan(0)

    const content = contextMessages[0].content
    const overviewIndex = content.indexOf('## Project Overview')
    const memoryBankIndex = content.indexOf('## Project Memory Bank')

    expect(overviewIndex).toBeGreaterThan(-1)
    expect(memoryBankIndex).toBeGreaterThan(-1)
    expect(overviewIndex).toBeLessThan(memoryBankIndex)
  })

  it('omits overview section when not provided', () => {
    const messages = getPromptForMode({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'code',
      provider: 'openai',
      userMessage: 'help me',
    })

    const allContent = messages.map((m) => m.content).join('\n')
    expect(allContent).not.toContain('## Project Overview')
  })
})
