import { describe, expect, test } from 'bun:test'
import { getPromptForMode, type PromptContext } from './prompt-library'

describe('project rules prompt composition', () => {
  test('renders bounded project rules into the normal system prompt context path', () => {
    const messages = getPromptForMode({
      projectId: 'project-1',
      chatId: 'chat-1',
      userId: 'user-1',
      chatMode: 'code',
      userMessage: 'Update the button',
      projectRules: [
        {
          path: '.panda/rules/ui.md',
          description: 'UI conventions',
          globs: ['apps/web/**/*.tsx'],
          content: 'Prefer accessible, semantic controls.',
        },
      ],
    } satisfies PromptContext)

    const system = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n')
    expect(system).toContain('## Project Rules')
    expect(system).toContain('.panda/rules/ui.md')
    expect(system).toContain('Prefer accessible, semantic controls.')
  })
})
