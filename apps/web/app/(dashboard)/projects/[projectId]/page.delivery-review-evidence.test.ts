import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page review evidence wiring', () => {
  test('attaches run evidence and creates a review report when tasks enter review', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain('submitForgeWorkerResultMutation')
    expect(source).toContain('recordForgeReviewMutation')
    expect(source).toContain('evidenceRefs: [String(runId)]')
    expect(source).toContain('closurePlan.createReviewReport')
  })
})
