import { describe, expect, test } from 'bun:test'
import {
  createUserHooksPlugin,
  getUserHookDecision,
  parseUserHooksConfig,
  USER_HOOK_DECISION_KEY,
} from './user-hooks'
import type { HookContext } from './types'

const hookContext: HookContext = {
  sessionID: 'session-1',
  messageID: 'message-1',
  step: 1,
  agent: {
    name: 'build',
    description: 'Build agent',
    mode: 'primary',
    model: 'test-model',
    prompt: 'test',
    permission: {},
  },
}

describe('user hooks config', () => {
  test('parses bounded .panda/hooks.json rules under the admin ceiling', () => {
    const resolution = parseUserHooksConfig(
      JSON.stringify({
        version: 1,
        hooks: [
          {
            id: 'ask-before-destructive-command',
            hook: 'tool.execute.before',
            match: { toolName: 'run_command', commandFamily: 'destructive' },
            action: 'ask',
            reason: 'Owner review required.',
            priority: 10,
          },
        ],
      })
    )

    expect(resolution.diagnostics).toHaveLength(0)
    expect(resolution.config.hooks).toHaveLength(1)
    expect(resolution.config.hooks[0].id).toBe('ask-before-destructive-command')
  })

  test('filters hooks that exceed the admin ceiling', () => {
    const resolution = parseUserHooksConfig(
      JSON.stringify({
        version: 1,
        hooks: [
          { id: 'blocked', hook: 'llm.request', action: 'deny' },
          { id: 'allowed', hook: 'tool.execute.before', action: 'deny' },
        ],
      }),
      { allowedHookTypes: ['tool.execute.before'] }
    )

    expect(resolution.config.hooks.map((hook) => hook.id)).toEqual(['allowed'])
    expect(resolution.diagnostics.some((diagnostic) => diagnostic.hookId === 'blocked')).toBe(true)
  })

  test('blocks WebContainer commands unless the admin ceiling allows them', () => {
    const resolution = parseUserHooksConfig(
      JSON.stringify({
        version: 1,
        hooks: [
          {
            id: 'command-hook',
            hook: 'tool.execute.before',
            action: 'deny',
            webcontainerCommand: 'bun test',
          },
        ],
      })
    )

    expect(resolution.config.hooks).toHaveLength(0)
    expect(resolution.diagnostics[0]?.code).toBe('webcontainer-command-disabled')
  })
})

describe('user hooks plugin', () => {
  test('adds a deny decision for matching tool.execute.before hooks', async () => {
    const plugin = createUserHooksPlugin({
      version: 1,
      hooks: [
        {
          id: 'deny-secret-read',
          hook: 'tool.execute.before',
          action: 'deny',
          match: { toolName: 'read_files', path: 'secrets/**' },
          reason: 'Secrets are not readable by agents.',
        },
      ],
    })

    const result = await plugin.hooks['tool.execute.before']?.(hookContext, {
      toolName: 'read_files',
      args: { paths: ['secrets/api-key.txt'] },
    })

    expect(getUserHookDecision(result)?.action).toBe('deny')
    expect((result as Record<string, unknown>)[USER_HOOK_DECISION_KEY]).toBeDefined()
  })

  test('transforms args without bypassing later policy checks', async () => {
    const plugin = createUserHooksPlugin({
      version: 1,
      hooks: [
        {
          id: 'rewrite-path',
          hook: 'tool.execute.before',
          action: 'transform',
          match: { toolName: 'read_files' },
          transform: { args: { paths: ['README.md'] } },
        },
      ],
    })

    const result = await plugin.hooks['tool.execute.before']?.(hookContext, {
      toolName: 'read_files',
      args: { paths: ['package.json'] },
    })

    expect((result as { args: { paths: string[] } }).args.paths).toEqual(['README.md'])
    expect(getUserHookDecision(result)).toBeUndefined()
  })
})
