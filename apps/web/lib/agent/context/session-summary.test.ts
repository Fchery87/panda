/**
 * Session Summary Tests
 *
 * Tests for the session-summary.ts module
 */

import { describe, test, expect } from 'bun:test'
import {
  buildPromptMessagesWithModeSummary,
  generateStructuredSummary,
  formatSummaryForHandoff,
  type ChatMessage,
} from './session-summary'

describe('generateStructuredSummary', () => {
  test('returns default summary for empty history', () => {
    const result = generateStructuredSummary({ messages: [] })

    expect(result.decisions).toEqual([])
    expect(result.filesModified).toEqual([])
    expect(result.currentState).toBe('No previous activity')
    expect(result.nextSteps).toEqual([])
    expect(result.keyContext).toEqual([])
  })

  test('extracts decisions from assistant messages', () => {
    const messages: ChatMessage[] = [
      {
        role: 'assistant',
        content: "I decided to use React for this project. We'll implement it with TypeScript.",
      },
      {
        role: 'user',
        content: 'Sounds good.',
      },
      {
        role: 'assistant',
        content: "Let's start with the components first. We will use hooks for state management.",
      },
    ]

    const result = generateStructuredSummary({ messages })

    expect(result.decisions.length).toBeGreaterThan(0)
    expect(result.decisions.some((d) => d.toLowerCase().includes('react'))).toBe(true)
  })

  test('extracts files modified from tool calls', () => {
    const messages: ChatMessage[] = [
      {
        role: 'assistant',
        content: "I'll update the files for you.",
        toolCalls: [
          {
            name: 'write_files',
            args: {
              files: [
                { path: 'src/index.ts', content: 'console.log("hello")' },
                { path: 'src/utils.ts', content: 'export const util = () => {}' },
              ],
            },
          },
        ],
      },
    ]

    const result = generateStructuredSummary({ messages })

    expect(result.filesModified.length).toBe(2)
    expect(result.filesModified.some((f) => f.path === 'src/index.ts')).toBe(true)
    expect(result.filesModified.some((f) => f.path === 'src/utils.ts')).toBe(true)
  })

  test('extracts files from message text when not in tool calls', () => {
    const messages: ChatMessage[] = [
      {
        role: 'assistant',
        content: 'I have created the `components/Button.tsx` file and updated `styles.css`.',
      },
    ]

    const result = generateStructuredSummary({ messages })

    expect(result.filesModified.length).toBeGreaterThan(0)
  })

  test('detects completion state', () => {
    const messages: ChatMessage[] = [
      {
        role: 'assistant',
        content: 'All tasks have been completed successfully. The feature is ready for testing.',
      },
    ]

    const result = generateStructuredSummary({ messages })

    expect(result.currentState).toContain('completed')
  })

  test('detects blocked state', () => {
    const messages: ChatMessage[] = [
      {
        role: 'assistant',
        content:
          'I encountered an error when trying to connect to the database. The connection failed.',
      },
    ]

    const result = generateStructuredSummary({ messages })

    expect(result.currentState.toLowerCase()).toContain('issue')
  })

  test('detects awaiting input state', () => {
    const messages: ChatMessage[] = [
      {
        role: 'assistant',
        content:
          'Let me know if you want me to proceed with the implementation or if you need any changes.',
      },
    ]

    const result = generateStructuredSummary({ messages })

    expect(result.currentState.toLowerCase()).toContain('awaiting')
  })

  test('extracts next steps', () => {
    const messages: ChatMessage[] = [
      {
        role: 'assistant',
        content:
          'Next: implement the API endpoint. We should also add error handling. Still need to write tests.',
      },
    ]

    const result = generateStructuredSummary({ messages })

    expect(result.nextSteps.length).toBeGreaterThan(0)
  })

  test('extracts key context', () => {
    const messages: ChatMessage[] = [
      {
        role: 'assistant',
        content:
          'Important: the API requires authentication. Note that rate limiting is set to 100 requests per minute.',
      },
    ]

    const result = generateStructuredSummary({ messages })

    expect(result.keyContext.length).toBeGreaterThan(0)
  })

  test('limits arrays to reasonable sizes', () => {
    const messages: ChatMessage[] = Array.from({ length: 20 }, (_, i) => ({
      role: 'assistant',
      content: `Important: context fact ${i}. Decision made: do thing ${i}.`,
    }))

    const result = generateStructuredSummary({ messages })

    expect(result.decisions.length).toBeLessThanOrEqual(5)
    expect(result.keyContext.length).toBeLessThanOrEqual(5)
    expect(result.filesModified.length).toBeLessThanOrEqual(10)
  })

  test('extracts current state from last assistant message', () => {
    const messages: ChatMessage[] = [
      {
        role: 'assistant',
        content: 'Starting work on the feature.',
      },
      {
        role: 'user',
        content: 'Continue.',
      },
      {
        role: 'assistant',
        content: 'Progress update: 50% complete. Working on the UI components now.',
      },
    ]

    const result = generateStructuredSummary({ messages })

    expect(result.currentState).toContain('50%')
  })
})

describe('formatSummaryForHandoff', () => {
  test('formats current state correctly', () => {
    const summary = generateStructuredSummary({
      messages: [
        {
          role: 'assistant',
          content: 'Task completed successfully.',
        },
      ],
    })

    const formatted = formatSummaryForHandoff(summary)

    expect(formatted).toContain('**Current State:**')
    expect(formatted).toContain('completed')
  })

  test('formats files modified section', () => {
    const summary: ReturnType<typeof generateStructuredSummary> = {
      decisions: [],
      filesModified: [
        { path: 'src/index.ts', description: 'modified' },
        { path: 'src/utils.ts', description: 'created' },
      ],
      currentState: 'In progress',
      nextSteps: [],
      keyContext: [],
    }

    const formatted = formatSummaryForHandoff(summary)

    expect(formatted).toContain('**Files Modified:**')
    expect(formatted).toContain('src/index.ts')
    expect(formatted).toContain('src/utils.ts')
  })

  test('formats decisions section', () => {
    const summary: ReturnType<typeof generateStructuredSummary> = {
      decisions: ['Use TypeScript', 'Implement with React'],
      filesModified: [],
      currentState: 'Planning complete',
      nextSteps: [],
      keyContext: [],
    }

    const formatted = formatSummaryForHandoff(summary)

    expect(formatted).toContain('**Decisions Made:**')
    expect(formatted).toContain('Use TypeScript')
  })

  test('formats next steps section', () => {
    const summary: ReturnType<typeof generateStructuredSummary> = {
      decisions: [],
      filesModified: [],
      currentState: 'In progress',
      nextSteps: ['Implement API', 'Add tests', 'Deploy'],
      keyContext: [],
    }

    const formatted = formatSummaryForHandoff(summary)

    expect(formatted).toContain('**Next Steps:**')
    expect(formatted).toContain('Implement API')
  })

  test('formats key context section', () => {
    const summary: ReturnType<typeof generateStructuredSummary> = {
      decisions: [],
      filesModified: [],
      currentState: 'In progress',
      nextSteps: [],
      keyContext: ['API rate limit is 100 req/min', 'Requires auth token'],
    }

    const formatted = formatSummaryForHandoff(summary)

    expect(formatted).toContain('**Key Context:**')
    expect(formatted).toContain('API rate limit')
  })

  test('omits empty sections', () => {
    const summary: ReturnType<typeof generateStructuredSummary> = {
      decisions: [],
      filesModified: [],
      currentState: 'No activity',
      nextSteps: [],
      keyContext: [],
    }

    const formatted = formatSummaryForHandoff(summary)

    expect(formatted).toContain('**Current State:**')
    expect(formatted).not.toContain('**Files Modified:**')
    expect(formatted).not.toContain('**Decisions Made:**')
  })

  test('truncates output exceeding token budget', () => {
    const summary: ReturnType<typeof generateStructuredSummary> = {
      decisions: Array.from(
        { length: 20 },
        (_, i) =>
          `Very long decision ${i} with lots of text and details about what was decided and why it matters`
      ),
      filesModified: Array.from({ length: 50 }, (_, i) => ({
        path: `src/very/long/path/to/the/file${i}.ts`,
        description: 'modified with extensive changes',
      })),
      currentState:
        'A very long current state description that goes on and on about everything that happened',
      nextSteps: Array.from(
        { length: 20 },
        (_, i) => `Step ${i}: Do something important with many details`
      ),
      keyContext: Array.from(
        { length: 20 },
        (_, i) =>
          `Context fact ${i} with detailed information about the project and its requirements`
      ),
    }

    const formatted = formatSummaryForHandoff(summary)

    expect(formatted).toContain('[... additional context available]')
    expect(formatted.length).toBeLessThanOrEqual(1700)
  })

  test('handles summary with all sections populated', () => {
    const summary: ReturnType<typeof generateStructuredSummary> = {
      decisions: ['Use React', 'TypeScript preferred'],
      filesModified: [
        { path: 'package.json', description: 'added dependencies' },
        { path: 'src/index.tsx', description: 'created' },
      ],
      currentState: 'Initial setup complete',
      nextSteps: ['Create components', 'Add routing'],
      keyContext: ['Node.js 18+ required', 'pnpm used for package management'],
    }

    const formatted = formatSummaryForHandoff(summary)

    expect(formatted).toContain('Current State')
    expect(formatted).toContain('Files Modified')
    expect(formatted).toContain('Decisions Made')
    expect(formatted).toContain('Next Steps')
    expect(formatted).toContain('Key Context')
  })
})

describe('buildPromptMessagesWithModeSummary', () => {
  test('injects deterministic cross-mode summary without leaking raw other-mode transcript', () => {
    const result = buildPromptMessagesWithModeSummary({
      currentMode: 'build',
      messages: [
        {
          role: 'user',
          content: 'Need the dashboard to support offline drafts.',
          mode: 'architect',
        },
        {
          role: 'assistant',
          content:
            'We decided to keep the draft store in Convex and important: preserve conflict resolution rules.',
          mode: 'architect',
        },
        {
          role: 'user',
          content: 'Implement the draft save button.',
          mode: 'build',
        },
        {
          role: 'assistant',
          content: 'I will update the toolbar component next.',
          mode: 'build',
        },
      ],
    })

    expect(result).toHaveLength(3)
    expect(result[0]?.role).toBe('user')
    expect(result[0]?.content).toContain('[Cross-mode context summary]')
    expect(result[0]?.content).toContain('Architect decisions')
    expect(result[0]?.content).toContain('keep the draft store in Convex')
    expect(result[0]?.content).toContain('User constraints')
    expect(result[0]?.content).toContain('offline drafts')
    expect(result[0]?.content).not.toContain('Need the dashboard to support offline drafts.')
    expect(result[1]?.content).toBe('Implement the draft save button.')
    expect(result[2]?.content).toBe('I will update the toolbar component next.')
  })

  test('preserves same-mode transcript when no other-mode context exists', () => {
    const result = buildPromptMessagesWithModeSummary({
      currentMode: 'build',
      messages: [
        {
          role: 'user',
          content: 'Implement the settings form.',
          mode: 'build',
        },
        {
          role: 'assistant',
          content: 'I will modify the settings page.',
          mode: 'build',
        },
      ],
    })

    expect(result).toEqual([
      { role: 'user', content: 'Implement the settings form.' },
      { role: 'assistant', content: 'I will modify the settings page.' },
    ])
  })

  test('does not promote unresolved architect questions into user constraints', () => {
    const result = buildPromptMessagesWithModeSummary({
      currentMode: 'build',
      messages: [
        {
          role: 'user',
          content: 'How should we support offline drafts?',
          mode: 'architect',
        },
        {
          role: 'user',
          content: 'Should we keep optimistic sync?',
          mode: 'architect',
        },
        {
          role: 'assistant',
          content: 'We decided to keep draft persistence in Convex.',
          mode: 'architect',
        },
      ],
    })

    expect(result[0]?.content).toContain('Architect decisions')
    expect(result[0]?.content).not.toContain('User constraints')
    expect(result[0]?.content).not.toContain('How should we support offline drafts')
    expect(result[0]?.content).not.toContain('Should we keep optimistic sync')
  })

  test('deduplicates overlapping assistant summary content across sections', () => {
    const result = buildPromptMessagesWithModeSummary({
      currentMode: 'build',
      messages: [
        {
          role: 'assistant',
          content:
            'We decided to keep the draft store in Convex. Important: keep the draft store in Convex.',
          mode: 'architect',
        },
      ],
    })

    expect(result[0]?.content).toContain('Architect decisions')
    expect(result[0]?.content).not.toContain('Key context:')
    expect(result[0]?.content?.match(/keep the draft store in Convex/g)?.length).toBe(1)
  })

  test('deduplicates overlap between key context and later user constraints', () => {
    const result = buildPromptMessagesWithModeSummary({
      currentMode: 'build',
      messages: [
        {
          role: 'assistant',
          content: 'Important: preserve conflict resolution rules.',
          mode: 'architect',
        },
        {
          role: 'user',
          content: 'We must preserve conflict resolution rules.',
          mode: 'architect',
        },
      ],
    })

    expect(result[0]?.content).toContain('Key context: preserve conflict resolution rules')
    expect(result[0]?.content).not.toContain('User constraints:')
    expect(result[0]?.content?.match(/preserve conflict resolution rules/g)?.length).toBe(1)
  })
})
