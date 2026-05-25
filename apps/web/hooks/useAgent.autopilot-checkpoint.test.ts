import { describe, expect, test } from 'bun:test'
import fs from 'fs'
import path from 'path'

describe('useAgent Autopilot checkpoint integration', () => {
  test('blocks Agent Autopilot transitions behind advisor review requests', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'useAgent.ts'), 'utf8')

    expect(source).toContain('evaluateAutopilotCheckpoint')
    expect(source).toContain('autopilotCheckpointRunEvent')
    expect(source).toContain("requiredFor: ['autopilot_checkpoint']")
    expect(source).toContain('createAdvisorReviewRequest')
    expect(source).toContain('Autopilot checkpoint is waiting for advisor review')
    expect(source).toContain("code: 'autopilot_checkpoint'")
  })
})
