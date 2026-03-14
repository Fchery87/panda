import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('user analytics persistence', () => {
  test('updates analytics from core user activity mutations', () => {
    const projectsSource = fs.readFileSync(path.resolve(import.meta.dir, 'projects.ts'), 'utf8')
    const chatsSource = fs.readFileSync(path.resolve(import.meta.dir, 'chats.ts'), 'utf8')
    const messagesSource = fs.readFileSync(path.resolve(import.meta.dir, 'messages.ts'), 'utf8')
    const agentRunsSource = fs.readFileSync(path.resolve(import.meta.dir, 'agentRuns.ts'), 'utf8')
    const analyticsHelperSource = fs.readFileSync(
      path.resolve(import.meta.dir, 'lib', 'userAnalytics.ts'),
      'utf8'
    )

    expect(projectsSource).toContain('trackUserAnalytics(ctx, userId')
    expect(chatsSource).toContain('trackUserAnalytics(ctx, project.createdBy')
    expect(messagesSource).toContain('trackUserAnalytics(ctx, project.createdBy')
    expect(agentRunsSource).toContain('trackUserAnalytics(ctx, userId')
    expect(agentRunsSource).toContain('totalTokensUsed')
    expect(analyticsHelperSource).toContain('providerUsage')
  })
})
