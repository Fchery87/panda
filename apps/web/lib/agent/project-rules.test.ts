import { describe, expect, test } from 'bun:test'
import {
  formatProjectRulesForPrompt,
  isProjectRulePath,
  parseProjectRuleFile,
  resolveProjectRulesForPrompt,
} from './project-rules'

describe('project rules', () => {
  test('parses .panda/rules markdown frontmatter and body', () => {
    const rule = parseProjectRuleFile({
      path: '.panda/rules/react.md',
      content: `---\ndescription: React conventions\nglobs: [apps/web/**/*.tsx, apps/web/**/*.ts]\nalwaysApply: false\n---\nUse accessible components.`,
    })

    expect(rule.description).toBe('React conventions')
    expect(rule.globs).toEqual(['apps/web/**/*.tsx', 'apps/web/**/*.ts'])
    expect(rule.alwaysApply).toBe(false)
    expect(rule.content).toContain('Use accessible components')
    expect(rule.diagnostics).toEqual([])
    expect(isProjectRulePath('.panda/rules/react.md')).toBe(true)
    expect(isProjectRulePath('docs/rules/react.md')).toBe(false)
  })

  test('bounds content and reports diagnostics', () => {
    const rule = parseProjectRuleFile({
      path: '.panda/rules/huge.md',
      content: `---\ninvalid\n---\n${'x'.repeat(13000)}`,
    })

    expect(rule.content.length).toBeLessThan(13000)
    expect(rule.diagnostics.map((diagnostic) => diagnostic.code)).toContain('invalid_frontmatter')
    expect(rule.diagnostics.map((diagnostic) => diagnostic.code)).toContain('rule_too_large')
  })

  test('resolves always-apply and glob-matched rules for prompt context', () => {
    const rules = [
      parseProjectRuleFile({
        path: '.panda/rules/global.md',
        content: `---\nalwaysApply: true\n---\nNever expose secrets.`,
      }),
      parseProjectRuleFile({
        path: '.panda/rules/web.md',
        content: `---\nglobs: [apps/web/**/*.tsx]\n---\nUse semantic markup.`,
      }),
      parseProjectRuleFile({
        path: '.panda/rules/server.md',
        content: `---\nglobs: [convex/**/*.ts]\n---\nUse indexes.`,
      }),
    ]

    const matched = resolveProjectRulesForPrompt({
      rules,
      activePaths: ['apps/web/components/Button.tsx'],
    })

    expect(matched.map((rule) => rule.path)).toEqual([
      '.panda/rules/global.md',
      '.panda/rules/web.md',
    ])
    expect(formatProjectRulesForPrompt(matched)).toContain('## Project Rules')
    expect(formatProjectRulesForPrompt(matched)).toContain('Never expose secrets')
  })
})
