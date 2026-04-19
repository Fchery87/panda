/**
 * Specification Persistence Helper
 *
 * Maps runtime specification events to Convex mutations.
 * Used by useAgent to persist spec lifecycle to the database.
 *
 * @module lib/agent/spec/persistence
 */

import type { Id } from '@convex/_generated/dataModel'
import type { FormalSpecification, SpecStatus, VerificationResult } from './types'

/**
 * Context required for spec persistence
 */
export interface SpecPersistenceContext {
  projectId: Id<'projects'>
  chatId: Id<'chats'>
  runId?: Id<'agentRuns'>
}

/**
 * Provenance fields for persistence (chatId is stored at top level)
 */
type ProvenanceInput = Omit<FormalSpecification['provenance'], 'chatId'>

/**
 * Input for creating a specification
 */
export interface CreateSpecInput {
  projectId: Id<'projects'>
  chatId: Id<'chats'>
  runId?: Id<'agentRuns'>
  version: number
  tier: FormalSpecification['tier']
  status: SpecStatus
  intent: FormalSpecification['intent']
  plan: FormalSpecification['plan']
  validation: FormalSpecification['validation']
  provenance: ProvenanceInput
  verificationResults?: VerificationResult[]
}

/**
 * Input for updating a specification
 */
export interface UpdateSpecInput {
  status?: SpecStatus
  tier?: FormalSpecification['tier']
  runId?: Id<'agentRuns'>
  intent?: FormalSpecification['intent']
  plan?: FormalSpecification['plan']
  validation?: FormalSpecification['validation']
  provenance?: ProvenanceInput
  verificationResults?: VerificationResult[]
}

/**
 * Converts a FormalSpecification to the format expected by Convex create mutation
 */
export function specToCreateInput(
  spec: FormalSpecification,
  context: {
    projectId: Id<'projects'>
    chatId: Id<'chats'>
    runId?: Id<'agentRuns'> | null
  }
): CreateSpecInput {
  const input: CreateSpecInput = {
    projectId: context.projectId,
    chatId: context.chatId,
    runId: context.runId ?? undefined,
    version: spec.version,
    tier: spec.tier,
    status: spec.status,
    intent: spec.intent,
    plan: spec.plan,
    validation: spec.validation,
    provenance: {
      model: spec.provenance.model,
      promptHash: spec.provenance.promptHash,
      timestamp: spec.provenance.timestamp,
      parentSpecId: spec.provenance.parentSpecId,
    } as ProvenanceInput,
    verificationResults: spec.verificationResults,
  }
  return input
}

/**
 * Converts a FormalSpecification to the format expected by Convex update mutation
 */
export function specToUpdateInput(spec: FormalSpecification): UpdateSpecInput {
  const input: UpdateSpecInput = {
    status: spec.status,
    tier: spec.tier,
    intent: spec.intent,
    plan: spec.plan,
    validation: spec.validation,
    provenance: {
      model: spec.provenance.model,
      promptHash: spec.provenance.promptHash,
      timestamp: spec.provenance.timestamp,
      parentSpecId: spec.provenance.parentSpecId,
    } as ProvenanceInput,
    verificationResults: spec.verificationResults,
  }
  return input
}

/**
 * Determines the status to persist based on the spec event type and verification result
 */
export function resolveSpecStatus(
  spec: FormalSpecification,
  eventType: 'spec_pending_approval' | 'spec_generated' | 'spec_verification',
  verificationPassed?: boolean
): SpecStatus {
  switch (eventType) {
    case 'spec_pending_approval':
      return 'draft'
    case 'spec_generated':
      return spec.status === 'approved' ? 'executing' : spec.status
    case 'spec_verification':
      if (verificationPassed === true) {
        return 'verified'
      } else if (verificationPassed === false) {
        return 'failed'
      }
      return spec.status
    default:
      return spec.status
  }
}

/**
 * Runtime state tracker for spec persistence
 * Tracks which specs have been persisted to avoid duplicate creates
 */
export class SpecPersistenceState {
  private persistedSpecs = new Map<string, Id<'specifications'>>()

  /**
   * Check if a spec has already been persisted
   */
  has(specId: string): boolean {
    return this.persistedSpecs.has(specId)
  }

  /**
   * Get the persisted Convex ID for a spec
   */
  get(specId: string): Id<'specifications'> | undefined {
    return this.persistedSpecs.get(specId)
  }

  /**
   * Mark a spec as persisted with its Convex ID
   */
  set(specId: string, convexId: Id<'specifications'>): void {
    this.persistedSpecs.set(specId, convexId)
  }

  /**
   * Clear all persisted specs (e.g., on run completion or error)
   */
  clear(): void {
    this.persistedSpecs.clear()
  }
}

/**
 * Creates a persistence input for a spec verification event
 */
export function createVerificationUpdateInput(
  spec: FormalSpecification,
  verificationResults: VerificationResult[]
): UpdateSpecInput {
  return {
    status: verificationResults.every((r) => r.passed) ? 'verified' : 'failed',
    verificationResults,
  }
}
