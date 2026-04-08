import type { Id } from '@convex/_generated/dataModel'
import type { FormalSpecification, VerificationResult } from '../lib/agent/spec/types'
import {
  createVerificationUpdateInput,
  resolveSpecStatus,
  specToCreateInput,
  type SpecPersistenceState,
} from '../lib/agent/spec/persistence'
import { appLog } from '@/lib/logger'

export function persistPendingApprovalSpec(args: {
  spec: FormalSpecification
  projectId: Id<'projects'>
  chatId: Id<'chats'>
  runId?: Id<'agentRuns'>
  specPersistence: SpecPersistenceState
  createSpec: (args: ReturnType<typeof specToCreateInput>) => Promise<Id<'specifications'>>
}): void {
  if (args.specPersistence.has(args.spec.id)) return

  const specInput = specToCreateInput(args.spec, {
    projectId: args.projectId,
    chatId: args.chatId,
    runId: args.runId,
  })

  void args
    .createSpec(specInput)
    .then((specId) => {
      args.specPersistence.set(args.spec.id, specId)
    })
    .catch((err: unknown) => {
      appLog.error('[useAgent] Failed to persist spec_pending_approval:', err)
    })
}

export function persistGeneratedSpec(args: {
  spec: FormalSpecification
  projectId: Id<'projects'>
  chatId: Id<'chats'>
  runId?: Id<'agentRuns'>
  specPersistence: SpecPersistenceState
  createSpec: (args: ReturnType<typeof specToCreateInput>) => Promise<Id<'specifications'>>
  updateSpec: (args: {
    specId: Id<'specifications'>
    updates: {
      status?: ReturnType<typeof resolveSpecStatus>
    }
  }) => Promise<unknown>
}): void {
  if (!args.specPersistence.has(args.spec.id)) {
    const specInput = specToCreateInput(args.spec, {
      projectId: args.projectId,
      chatId: args.chatId,
      runId: args.runId,
    })

    void args
      .createSpec(specInput)
      .then((specId) => {
        args.specPersistence.set(args.spec.id, specId)
      })
      .catch((err: unknown) => {
        appLog.error('[useAgent] Failed to persist spec_generated:', err)
      })
    return
  }

  const convexId = args.specPersistence.get(args.spec.id)
  if (!convexId) return

  const newStatus = resolveSpecStatus(args.spec, 'spec_generated')
  void args
    .updateSpec({
      specId: convexId,
      updates: { status: newStatus },
    })
    .catch((err: unknown) => {
      appLog.error('[useAgent] Failed to update spec_generated status:', err)
    })
}

export function persistVerifiedSpec(args: {
  spec: FormalSpecification
  verificationResults: VerificationResult[]
  specPersistence: SpecPersistenceState
  updateSpec: (args: {
    specId: Id<'specifications'>
    updates: ReturnType<typeof createVerificationUpdateInput>
  }) => Promise<unknown>
}): void {
  const convexId = args.specPersistence.get(args.spec.id)
  if (!convexId) return

  const updates = createVerificationUpdateInput(args.spec, args.verificationResults)
  void args
    .updateSpec({
      specId: convexId,
      updates,
    })
    .catch((err: unknown) => {
      appLog.error('[useAgent] Failed to update spec_verification:', err)
    })
}
