import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Project page Forge control-plane lifecycle wiring', () => {
  test('uses forge lifecycle mutations for run start and completion instead of legacy review or QA writers', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    expect(source).toContain('useMutation(api.forge.startTaskExecution)')
    expect(source).toContain('useMutation(api.forge.submitWorkerResult)')
    expect(source).toContain('useMutation(api.forge.recordReview)')
    expect(source).toContain('useMutation(api.forge.runQaForTask)')
    expect(source).toContain('useMutation(api.forge.recordShipDecision)')

    expect(source).not.toContain('useMutation(api.reviewReports.create)')
    expect(source).not.toContain('useMutation(api.qaReports.create)')
    expect(source).not.toContain('useMutation(api.shipReports.create)')
    expect(source).not.toContain('useMutation(api.deliveryTasks.attachEvidence)')
  })
})
