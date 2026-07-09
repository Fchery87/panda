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
    const runTelemetrySource = fs.readFileSync(
      path.resolve(import.meta.dir, 'lib', 'runTelemetry.ts'),
      'utf8'
    )

    expect(projectsSource).toContain('trackUserAnalytics(ctx, userId')
    expect(chatsSource).toContain('trackUserAnalytics(ctx, project.createdBy')
    expect(messagesSource).toContain('trackUserAnalytics(ctx, project.createdBy')
    expect(messagesSource).toContain('skipAnalytics: v.optional(v.boolean())')
    expect(messagesSource).toContain('analyticsTracked: args.skipAnalytics ? false : true')
    expect(chatsSource).toContain('trackedMessageCount')
    expect(chatsSource).toContain('totalMessages: -trackedMessageCount')
    expect(projectsSource).toContain('trackedMessageCount')
    expect(projectsSource).toContain('return trackedMessageCount')
    expect(agentRunsSource).toContain('trackRunStartAnalytics(ctx, userId')
    expect(agentRunsSource).toContain('trackRunTerminalAnalytics(ctx, userId, run')
    expect(agentRunsSource).toContain('analyticsPendingMessageId')
    expect(runTelemetrySource).toContain('pendingMessage?.analyticsTracked === false')
    expect(runTelemetrySource).toContain('totalTokensUsed')
    expect(analyticsHelperSource).toContain('providerUsage')
  })
})
