import { describe, expect, test } from 'bun:test'
import {
  buildPlanTaskSeeds,
  buildSpecVerificationRecordInput,
  buildDriftFollowUpAction,
} from './reconciliation'
import type { FormalSpecification } from '../agent/spec/types'
import type { GeneratedPlanArtifact } from '../planning/types'

const planArtifact: GeneratedPlanArtifact = {
  chatId: 'chat_1',
  sessionId: 'planning_session_1',
  title: 'Forge retrofit plan',
  summary: 'Implement the canonical Forge control plane.',
  markdown: `# Forge retrofit plan

## Goal
Retrofit Panda into a Forge-aligned system.

## Implementation Plan
1. Define canonical Forge contracts
2. Add Forge snapshot query
3. Retrofit the workbench`,
  sections: [
    {
      id: 'goal',
      title: 'Goal',
      content: 'Retrofit Panda into a Forge-aligned system.',
      order: 1,
    },
    {
      id: 'plan',
      title: 'Implementation Plan',
      content:
        '1. Define canonical Forge contracts\n2. Add Forge snapshot query\n3. Retrofit the workbench',
      order: 2,
    },
  ],
  acceptanceChecks: ['Snapshot query exists', 'Workbench reads canonical snapshot'],
  status: 'accepted',
  generatedAt: 100,
}

const spec: FormalSpecification = {
  id: 'spec_1',
  version: 1,
  tier: 'ambient',
  status: 'verified',
  intent: {
    goal: 'Implement the Forge snapshot query',
    rawMessage: 'Build the canonical project snapshot',
    constraints: [],
    acceptanceCriteria: [],
  },
  plan: {
    steps: [],
    dependencies: [],
    risks: [],
    estimatedTools: [],
  },
  validation: {
    preConditions: [],
    postConditions: [],
    invariants: [],
  },
  provenance: {
    model: 'gpt-5',
    promptHash: 'hash_1',
    timestamp: 100,
    chatId: 'chat_1',
  },
  createdAt: 100,
  updatedAt: 100,
}

describe('forge reconciliation', () => {
  test('derives planned task seeds from an approved plan artifact', () => {
    const tasks = buildPlanTaskSeeds(planArtifact)

    expect(tasks).toHaveLength(3)
    expect(tasks[0]?.taskKey).toBe('planning_session_1-step-1')
    expect(tasks[0]?.title).toContain('Define canonical Forge contracts')
  })

  test('creates a verification record input from a verified spec', () => {
    const verification = buildSpecVerificationRecordInput({
      deliveryStateId: 'delivery_state_1',
      taskId: 'task_1',
      spec,
      evidenceRef: 'spec:spec_1',
      now: 200,
    })

    expect(verification.kind).toBe('review')
    expect(verification.status).toBe('passed')
    expect(verification.evidenceRefs).toContain('spec:spec_1')
  })

  test('creates a follow-up action for drift findings', () => {
    const followUp = buildDriftFollowUpAction({
      specId: 'spec_1',
      changedFiles: ['apps/web/app/(dashboard)/projects/[projectId]/page.tsx'],
      summary: 'Spec drift detected after page-level changes.',
    })

    expect(followUp.ownerRole).toBe('manager')
    expect(followUp.title).toContain('Reconcile spec drift')
    expect(followUp.description).toContain('spec_1')
  })
})
