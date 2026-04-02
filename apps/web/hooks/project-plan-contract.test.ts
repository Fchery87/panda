import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { isExecutablePlanArtifact } from './useProjectMessageWorkflow'

describe('project plan contract wiring', () => {
  test('treats accepted and resumed plan artifacts as executable contracts', () => {
    expect(isExecutablePlanArtifact({ status: 'accepted' })).toBe(true)
    expect(isExecutablePlanArtifact({ status: 'executing' })).toBe(true)
    expect(isExecutablePlanArtifact({ status: 'failed' })).toBe(true)
    expect(isExecutablePlanArtifact({ status: 'completed' })).toBe(true)
    expect(isExecutablePlanArtifact({ status: 'ready_for_review' })).toBe(false)
    expect(isExecutablePlanArtifact(null)).toBe(false)
  })

  test('approves generated plans through the planning session mutation', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'useProjectPlanDraft.ts'), 'utf8')

    expect(source).toContain('activePlanningSession?.sessionId')
    expect(source).toContain('activePlanningSession.generatedPlan')
    expect(source).toContain('acceptPlanningSession')
  })

  test('marks approved plan execution through planning session state transitions', () => {
    const pageSource = fs.readFileSync(
      path.resolve(import.meta.dir, '../app/(dashboard)/projects/[projectId]/page.tsx'),
      'utf8'
    )
    const workflowSource = fs.readFileSync(
      path.resolve(import.meta.dir, 'useProjectMessageWorkflow.ts'),
      'utf8'
    )

    expect(pageSource).toContain('api.planningSessions.markExecutionState')
    expect(pageSource).toContain('approvedPlanRunSessionsRef')
    expect(workflowSource).toContain('approvedPlanArtifact')
    expect(workflowSource).toContain('markPlanningExecutionState')
  })
})
