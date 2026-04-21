import { describe, test, expect } from 'bun:test'
import type { Id } from '@convex/_generated/dataModel'
import type { FormalSpecification, VerificationResult } from './types'
import {
  specToCreateInput,
  specToUpdateInput,
  resolveSpecStatus,
  SpecPersistenceState,
  createVerificationUpdateInput,
  type SpecPersistenceContext,
} from './persistence'

describe('spec persistence', () => {
  const mockContext: SpecPersistenceContext = {
    projectId: 'proj_123' as Id<'projects'>,
    chatId: 'chat_456' as Id<'chats'>,
    runId: 'run_789' as Id<'agentRuns'>,
    planningSessionId: 'planning_123',
  }

  const mockSpec: FormalSpecification = {
    id: 'spec_abc',
    version: 1,
    tier: 'ambient',
    status: 'draft',
    intent: {
      goal: 'Test goal',
      rawMessage: 'Test message',
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
      model: 'gpt-4o',
      promptHash: 'hash123',
      timestamp: Date.now(),
      chatId: 'chat_456',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  describe('specToCreateInput', () => {
    test('converts spec to create input format', () => {
      const input = specToCreateInput(mockSpec, mockContext)

      expect(input.projectId).toBe(mockContext.projectId)
      expect(input.chatId).toBe(mockContext.chatId)
      expect(input.runId).toBe(mockContext.runId)
      expect(input.planningSessionId).toBe(mockContext.planningSessionId)
      expect(input.version).toBe(mockSpec.version)
      expect(input.tier).toBe(mockSpec.tier)
      expect(input.status).toBe(mockSpec.status)
      expect(input.intent).toEqual(mockSpec.intent)
      expect(input.plan).toEqual(mockSpec.plan)
      expect(input.validation).toEqual(mockSpec.validation)
      expect(input.provenance.model).toBe(mockSpec.provenance.model)
      expect(input.provenance.promptHash).toBe(mockSpec.provenance.promptHash)
      expect(input.provenance.timestamp).toBe(mockSpec.provenance.timestamp)
    })

    test('handles optional runId', () => {
      const contextWithoutRun: SpecPersistenceContext = {
        projectId: 'proj_123' as Id<'projects'>,
        chatId: 'chat_456' as Id<'chats'>,
      }

      const input = specToCreateInput(mockSpec, contextWithoutRun)
      expect(input.runId).toBeUndefined()
      expect(input.planningSessionId).toBeUndefined()
    })

    test('preserves planningSessionId when provided', () => {
      const input = specToCreateInput(mockSpec, {
        ...mockContext,
        planningSessionId: 'planning_linked',
      })

      expect(input.planningSessionId).toBe('planning_linked')
    })

    test('preserves parentSpecId from provenance', () => {
      const specWithParent: FormalSpecification = {
        ...mockSpec,
        provenance: {
          ...mockSpec.provenance,
          parentSpecId: 'parent_123',
        },
      }

      const input = specToCreateInput(specWithParent, mockContext)
      expect(input.provenance.parentSpecId).toBe('parent_123')
    })
  })

  describe('specToUpdateInput', () => {
    test('converts spec to update input format', () => {
      const input = specToUpdateInput(mockSpec)

      expect(input.status).toBe(mockSpec.status)
      expect(input.tier).toBe(mockSpec.tier)
      expect(input.intent).toEqual(mockSpec.intent)
      expect(input.plan).toEqual(mockSpec.plan)
      expect(input.validation).toEqual(mockSpec.validation)
    })
  })

  describe('resolveSpecStatus', () => {
    test('returns draft for spec_pending_approval event', () => {
      const status = resolveSpecStatus(mockSpec, 'spec_pending_approval')
      expect(status).toBe('draft')
    })

    test('returns executing for spec_generated when spec is approved', () => {
      const approvedSpec: FormalSpecification = { ...mockSpec, status: 'approved' }
      const status = resolveSpecStatus(approvedSpec, 'spec_generated')
      expect(status).toBe('executing')
    })

    test('preserves spec status for spec_generated when not approved', () => {
      const status = resolveSpecStatus(mockSpec, 'spec_generated')
      expect(status).toBe('draft')
    })

    test('returns verified for spec_verification when all checks pass', () => {
      const status = resolveSpecStatus(mockSpec, 'spec_verification', true)
      expect(status).toBe('verified')
    })

    test('returns failed for spec_verification when checks fail', () => {
      const status = resolveSpecStatus(mockSpec, 'spec_verification', false)
      expect(status).toBe('failed')
    })

    test('preserves current status when verification result is undefined', () => {
      const executingSpec: FormalSpecification = { ...mockSpec, status: 'executing' }
      const status = resolveSpecStatus(executingSpec, 'spec_verification')
      expect(status).toBe('executing')
    })
  })

  describe('SpecPersistenceState', () => {
    test('tracks persisted specs', () => {
      const state = new SpecPersistenceState()
      const specId = 'spec_123'
      const convexId = 'convex_456' as Id<'specifications'>

      expect(state.has(specId)).toBe(false)

      state.set(specId, convexId)

      expect(state.has(specId)).toBe(true)
      expect(state.get(specId)).toBe(convexId)
    })

    test('clears all specs', () => {
      const state = new SpecPersistenceState()
      state.set('spec_1', 'convex_1' as Id<'specifications'>)
      state.set('spec_2', 'convex_2' as Id<'specifications'>)

      state.clear()

      expect(state.has('spec_1')).toBe(false)
      expect(state.has('spec_2')).toBe(false)
    })

    test('returns undefined for unknown spec', () => {
      const state = new SpecPersistenceState()
      expect(state.get('unknown')).toBeUndefined()
    })
  })

  describe('createVerificationUpdateInput', () => {
    test('creates update input for passed verification', () => {
      const results: VerificationResult[] = [
        { criterionId: 'c1', passed: true },
        { criterionId: 'c2', passed: true },
      ]

      const input = createVerificationUpdateInput(mockSpec, results)

      expect(input.status).toBe('verified')
      expect(input.verificationResults).toEqual(results)
    })

    test('creates update input for failed verification', () => {
      const results: VerificationResult[] = [
        { criterionId: 'c1', passed: true },
        { criterionId: 'c2', passed: false, message: 'Failed' },
      ]

      const input = createVerificationUpdateInput(mockSpec, results)

      expect(input.status).toBe('failed')
      expect(input.verificationResults).toEqual(results)
    })

    test('handles empty results', () => {
      const input = createVerificationUpdateInput(mockSpec, [])

      expect(input.status).toBe('verified')
      expect(input.verificationResults).toEqual([])
    })
  })
})
