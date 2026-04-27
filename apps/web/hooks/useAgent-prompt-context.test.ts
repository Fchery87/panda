import { describe, expect, test } from 'bun:test'
import { buildAgentPromptBundle } from './useAgent-prompt-context'
import type { Id } from '@convex/_generated/dataModel'
import type { LLMProvider } from '@/lib/llm/types'

const baseProvider = {
  config: {
    provider: 'anthropic',
  },
} as LLMProvider

describe('buildAgentPromptBundle', () => {
  test('builds prompt context with provider fallback, mode-filtered history, and metadata-only files', () => {
    const bundle = buildAgentPromptBundle({
      projectId: 'project-1' as Id<'projects'>,
      chatId: 'chat-1' as Id<'chats'>,
      userId: 'user-1' as Id<'users'>,
      projectName: 'Panda',
      projectDescription: 'Agent workbench',
      mode: 'build',
      provider: baseProvider,
      messages: [
        { role: 'user', mode: 'plan', content: 'Plan the editor' },
        { role: 'assistant', mode: 'plan', content: 'Use a compact editor plan.' },
        { role: 'user', mode: 'build', content: 'Build it' },
        { role: 'assistant', mode: 'build', content: 'Working.' },
        { role: 'tool', mode: 'build', content: 'tool output' },
      ],
      projectOverviewContent: 'Repo overview',
      projectFiles: [{ path: 'apps/web/app/page.tsx', updatedAt: 123 }],
      memoryBankContent: 'Remember brutalist UI.',
      userContent: 'Ship the editor',
      contextFiles: ['apps/web/app/page.tsx'],
      architectBrainstormEnabled: true,
    })

    expect(bundle.providerType).toBe('anthropic')
    expect(bundle.previousMessagesSnapshot).toEqual([
      { role: 'user', content: 'Build it' },
      { role: 'assistant', content: 'Working.' },
    ])
    expect(bundle.promptContext.provider).toBe('anthropic')
    const previousMessages = bundle.promptContext.previousMessages ?? []
    expect(previousMessages).toEqual([
      { role: 'user', content: 'Build it' },
      {
        role: 'assistant',
        content: 'Working.',
      },
    ])
    expect(previousMessages.at(-1)).toEqual({
      role: 'assistant',
      content: 'Working.',
    })
    expect(bundle.promptContext.projectOverview).toBe('Repo overview')
    expect(bundle.promptContext.memoryBank).toBe('Remember brutalist UI.')
    expect(bundle.promptContext.userMessage).toContain('Ship the editor')
    expect(bundle.promptContext.userMessage).toContain('File: apps/web/app/page.tsx')
    expect(bundle.contextAudit).toEqual({
      filesConsidered: [{ path: 'apps/web/app/page.tsx', relevanceScore: 0 }],
      filesLoaded: [],
      filesExcluded: [],
      memoryBankIncluded: true,
      specIncluded: false,
      planIncluded: false,
      sessionSummaryIncluded: false,
      compactionOccurred: false,
      truncated: false,
    })
  })

  test('defaults provider to openai and forwards approved plan execution context', () => {
    const plan = {
      chatId: 'chat-1',
      sessionId: 'planning-1',
      title: 'Approved plan',
      summary: 'Build from plan.',
      markdown: '# Approved plan',
      sections: [],
      acceptanceChecks: [],
      status: 'accepted',
      generatedAt: 1,
      acceptedAt: 2,
    } as never

    const bundle = buildAgentPromptBundle({
      projectId: 'project-1' as Id<'projects'>,
      chatId: 'chat-1' as Id<'chats'>,
      userId: 'user-1' as Id<'users'>,
      mode: 'build',
      provider: null,
      messages: [],
      userContent: 'Execute',
      approvedPlanExecutionContext: {
        sessionId: 'planning-1',
        plan,
      },
    })

    expect(bundle.providerType).toBe('openai')
    expect(bundle.previousMessagesSnapshot).toEqual([])
    expect(bundle.promptContext.provider).toBe('openai')
    expect(bundle.promptContext.approvedPlanExecution).toEqual({
      sessionId: 'planning-1',
      plan,
    })
  })
})
