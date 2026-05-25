import { describe, expect, test } from 'bun:test'
import fs from 'fs'
import path from 'path'

describe('WorkbenchRightPanel advisor reviewer integration', () => {
  test('wires advisor request panel to eval-backed reviewer runner', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'WorkbenchRightPanel.tsx'), 'utf8')

    expect(source).toContain('AdvisorReviewRequestsPanel')
    expect(source).toContain('runAdvisorReviewer')
    expect(source).toContain('onRunEvalScenario')
    expect(source).toContain('AdvisorReviewRequestsPanel')
    expect(source).toContain("evalMode: 'read_only'")
    expect(source).toContain("subagentName: 'advisor-reviewer'")
    expect(source).toContain('AdvisorReviewsPanel')
  })
})
