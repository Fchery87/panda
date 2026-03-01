'use client'

import { useQuery, useMutation } from 'convex/react'
import type { Id } from '@convex/_generated/dataModel'
import { api } from '@convex/_generated/api'
import type {
  FormalSpecification,
  SpecTier,
  SpecStatus,
  Constraint,
  AcceptanceCriterion,
  SpecStep,
  FileDependency,
  Risk,
  Condition,
  Invariant,
  VerificationResult,
} from '@/lib/agent/spec/types'

// Re-export types for convenience
export type {
  FormalSpecification,
  SpecTier,
  SpecStatus,
  Constraint,
  AcceptanceCriterion,
  SpecStep,
  FileDependency,
  Risk,
  Condition,
  Invariant,
  VerificationResult,
}

interface UseSpecificationsOptions {
  projectId?: Id<'projects'>
  chatId?: Id<'chats'>
  runId?: Id<'agentRuns'>
  limit?: number
}

interface CreateSpecInput {
  projectId: Id<'projects'>
  chatId: Id<'chats'>
  runId?: Id<'agentRuns'>
  version?: number
  tier: SpecTier
  status?: SpecStatus
  intent: {
    goal: string
    rawMessage: string
    constraints: Constraint[]
    acceptanceCriteria: AcceptanceCriterion[]
  }
  plan: {
    steps: SpecStep[]
    dependencies: FileDependency[]
    risks: Risk[]
    estimatedTools: string[]
  }
  validation: {
    preConditions: Condition[]
    postConditions: Condition[]
    invariants: Invariant[]
  }
  provenance: {
    model: string
    promptHash: string
    timestamp: number
    parentSpecId?: string
  }
  verificationResults?: VerificationResult[]
}

interface UpdateSpecInput {
  status?: SpecStatus
  tier?: SpecTier
  runId?: Id<'agentRuns'>
  intent?: {
    goal: string
    rawMessage: string
    constraints: Constraint[]
    acceptanceCriteria: AcceptanceCriterion[]
  }
  plan?: {
    steps: SpecStep[]
    dependencies: FileDependency[]
    risks: Risk[]
    estimatedTools: string[]
  }
  validation?: {
    preConditions: Condition[]
    postConditions: Condition[]
    invariants: Invariant[]
  }
  provenance?: {
    model: string
    promptHash: string
    timestamp: number
    parentSpecId?: string
  }
  verificationResults?: VerificationResult[]
}

/**
 * Hook for fetching and managing specifications
 *
 * Provides real-time access to specifications via Convex subscriptions.
 * Includes queries for listing specs by project, chat, run, status, and tier,
 * as well as mutations for creating, updating, and archiving specs.
 *
 * @example
 * ```tsx
 * const { specs, isLoading, createSpec, updateSpec } = useSpecifications({
 *   projectId: 'project123',
 * })
 * ```
 */
export function useSpecifications(options: UseSpecificationsOptions = {}) {
  const { projectId, chatId, runId, limit = 100 } = options

  // Queries
  const specsByProject = useQuery(
    api.specifications.listByProject,
    projectId ? { projectId, limit } : 'skip'
  )

  const specsByChat = useQuery(api.specifications.listByChat, chatId ? { chatId, limit } : 'skip')

  const specsByRun = useQuery(api.specifications.listByRun, runId ? { runId, limit } : 'skip')

  const latestByChat = useQuery(api.specifications.getLatestByChat, chatId ? { chatId } : 'skip')

  // Mutations
  const createSpecMutation = useMutation(api.specifications.create)
  const updateSpecMutation = useMutation(api.specifications.update)
  const removeSpecMutation = useMutation(api.specifications.remove)
  const archiveSpecMutation = useMutation(api.specifications.archive)

  /**
   * Create a new specification
   */
  const createSpec = async (input: CreateSpecInput): Promise<Id<'specifications'>> => {
    return await createSpecMutation({
      ...input,
      version: input.version ?? 1,
      status: input.status ?? 'draft',
    })
  }

  /**
   * Update an existing specification
   */
  const updateSpec = async (
    specId: Id<'specifications'>,
    updates: UpdateSpecInput
  ): Promise<void> => {
    await updateSpecMutation({ specId, updates })
  }

  /**
   * Delete a specification permanently
   */
  const removeSpec = async (specId: Id<'specifications'>): Promise<void> => {
    await removeSpecMutation({ specId })
  }

  /**
   * Archive a specification (soft delete)
   */
  const archiveSpec = async (specId: Id<'specifications'>): Promise<void> => {
    await archiveSpecMutation({ specId })
  }

  return {
    // Data
    specsByProject,
    specsByChat,
    specsByRun,
    latestByChat,

    // Loading states
    isLoading: {
      byProject: specsByProject === undefined,
      byChat: specsByChat === undefined,
      byRun: specsByRun === undefined,
      latestByChat: latestByChat === undefined,
    },

    // Mutations
    createSpec,
    updateSpec,
    removeSpec,
    archiveSpec,
  }
}

/**
 * Hook for fetching specifications by status
 *
 * @example
 * ```tsx
 * const { specs } = useSpecsByStatus({
 *   projectId: 'project123',
 *   status: 'verified',
 * })
 * ```
 */
export function useSpecsByStatus({
  projectId,
  status,
  limit = 100,
}: {
  projectId: Id<'projects'>
  status: SpecStatus
  limit?: number
}) {
  const specs = useQuery(
    api.specifications.listByStatus,
    projectId ? { projectId, status, limit } : 'skip'
  )

  return {
    specs,
    isLoading: specs === undefined,
  }
}

/**
 * Hook for fetching specifications by tier
 *
 * @example
 * ```tsx
 * const { specs } = useSpecsByTier({
 *   projectId: 'project123',
 *   tier: 'ambient',
 * })
 * ```
 */
export function useSpecsByTier({
  projectId,
  tier,
  limit = 100,
}: {
  projectId: Id<'projects'>
  tier: SpecTier
  limit?: number
}) {
  const specs = useQuery(
    api.specifications.listByTier,
    projectId ? { projectId, tier, limit } : 'skip'
  )

  return {
    specs,
    isLoading: specs === undefined,
  }
}

/**
 * Hook for fetching a single specification by ID
 *
 * @example
 * ```tsx
 * const { spec, isLoading } = useSpec('spec123')
 * ```
 */
export function useSpec(specId: Id<'specifications'> | null) {
  const spec = useQuery(api.specifications.get, specId ? { specId } : 'skip')

  return {
    spec,
    isLoading: spec === undefined,
  }
}
