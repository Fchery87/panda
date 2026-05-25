import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { WORKFLOW_CHAIN_TEMPLATES } from '../apps/web/lib/agent/workflow/chains'

describe('workflow chain convex contract', () => {
  test('chain templates can be converted to persisted step state', () => {
    const template = WORKFLOW_CHAIN_TEMPLATES.find((chain) => chain.id === 'research-to-plan')
    expect(template).toBeDefined()
    const steps = template!.steps.map((step) => ({
      id: step.id,
      stage: step.stage,
      mode: step.mode,
      label: step.label,
      status: 'pending' as const,
    }))

    expect(steps).toEqual([
      { id: 'research', stage: 'research', mode: 'ask', label: 'Research', status: 'pending' },
      { id: 'design', stage: 'design', mode: 'plan', label: 'Design', status: 'pending' },
      { id: 'plan', stage: 'plan', mode: 'plan', label: 'Plan', status: 'pending' },
    ])
  })

  test('workflow chain steps can link to agent run ids', () => {
    const schema = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'workflowChains.ts'), 'utf8')

    expect(schema).toContain("runId: v.optional(v.id('agentRuns'))")
    expect(source).toContain('runId: v.optional')
    expect(source).toContain('args.runId')
  })
})
