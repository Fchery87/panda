import { describe, expect, test } from 'bun:test'
import { buildPlanContext } from './plan-context'

describe('buildPlanContext', () => {
  test('prioritizes likely impacted routes, schema, and tests for planning prompts', () => {
    const context = buildPlanContext({
      userMessage: 'Plan an auth dashboard change and update the schema and e2e coverage.',
      files: [
        { path: 'apps/web/app/auth/page.tsx', content: 'export default function AuthPage() {}' },
        { path: 'convex/schema.ts', content: 'export default {}' },
        { path: 'apps/web/e2e/auth.e2e-spec.ts', content: "test('auth flow', () => {})" },
        { path: 'README.md', content: '# Docs' },
      ],
    })

    expect(context).toContain('## Likely Relevant Files')
    expect(context).toContain('apps/web/app/auth/page.tsx')
    expect(context).toContain('convex/schema.ts')
    expect(context).toContain('apps/web/e2e/auth.e2e-spec.ts')
    expect(context).not.toContain('README.md')
  })

  test('returns null when no relevant files are found', () => {
    const context = buildPlanContext({
      userMessage: 'Plan a payment gateway migration.',
      files: [{ path: 'README.md', content: '# Docs' }],
    })

    expect(context).toBeNull()
  })
})
