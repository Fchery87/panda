import { describe, expect, test } from 'bun:test'
import {
  buildAdvisorReviewerPrompt,
  buildArtifactAdvisorReviewRequest,
  parseAdvisorReviewerOutput,
} from './advisor-reviewer'

describe('advisor reviewer automation helpers', () => {
  test('builds a strict advisor-reviewer prompt for risky artifact actions', () => {
    const prompt = buildAdvisorReviewerPrompt({
      gates: ['destructive_command'],
      action: { type: 'command_run', payload: { command: 'rm -rf tmp' } },
    })

    expect(prompt).toContain('Panda advisor-reviewer')
    expect(prompt).toContain('destructive_command')
    expect(prompt).toContain('rm -rf tmp')
    expect(prompt).toContain('Return strict JSON only')
  })

  test('parses valid reviewer JSON and conservatively handles malformed output', () => {
    expect(
      parseAdvisorReviewerOutput(
        '{"status":"approved","summary":"Safe.","risks":[]}'
      )
    ).toEqual({ status: 'approved', summary: 'Safe.', risks: [] })

    const fallback = parseAdvisorReviewerOutput('not json')
    expect(fallback.status).toBe('needs_changes')
    expect(fallback.risks[0]?.severity).toBe('medium')
  })

  test('creates artifact review request only when advisor preflight is required', () => {
    const request = buildArtifactAdvisorReviewRequest({
      artifactId: 'artifact_1',
      action: { type: 'command_run', payload: { command: 'rm -rf tmp' } },
      policy: { enabled: true, requiredFor: ['destructive_command'], reasoningEffort: 'high' },
    })

    expect(request).toMatchObject({ artifactId: 'artifact_1', gates: ['destructive_command'] })
    expect(request?.prompt).toContain('rm -rf tmp')

    expect(
      buildArtifactAdvisorReviewRequest({
        artifactId: 'artifact_2',
        action: { type: 'command_run', payload: { command: 'echo ok' } },
        policy: { enabled: true, requiredFor: ['destructive_command'], reasoningEffort: 'high' },
      })
    ).toBeNull()
  })
})
