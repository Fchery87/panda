import type { ChatMode } from '@/lib/agent/chat-modes'
import {
  resolveRuntimeAvailability,
  type RuntimeProviderStatus,
} from '@/lib/workspace/runtime-availability'

export type RoutingConfidence = 'high' | 'medium' | 'low'

export type RoutingDecisionSource = 'manual_override' | 'deterministic_rules'

export type ThreadPhase =
  | 'idle'
  | 'has_question'
  | 'plan_drafting'
  | 'plan_approved'
  | 'building'
  | 'reviewing'
  | 'complete'

export type WebContainerPhase = 'unavailable' | 'booting' | 'ready' | 'error' | 'unsupported'

export interface WebContainerStatus {
  phase: WebContainerPhase
  lastError?: string
}

export interface ThreadState {
  phase: ThreadPhase
  hasActivePlanningSession: boolean
  hasApprovedPlan: boolean
  hasRunningAgentRun: boolean
  webcontainerStatus: WebContainerStatus
}

export interface RoutingInput {
  message: string
  requestedMode: ChatMode
  resolvedMode: ChatMode
  threadState: ThreadState
  oversightLevel: 'review' | 'autopilot'
  manualOverride: boolean
  webcontainerStatus: WebContainerStatus
}

export interface RoutingDecision {
  requestedMode: ChatMode
  resolvedMode: ChatMode
  agent: ChatMode
  confidence: RoutingConfidence
  rationale: string
  requiresApproval: boolean
  webcontainerRequired: boolean
  suggestedSkills: string[]
  source: RoutingDecisionSource
}

export type WebContainerProviderStatus = RuntimeProviderStatus

export function getDefaultWebContainerStatus(): WebContainerStatus {
  return { phase: 'unavailable' }
}

export function normalizeWebContainerStatus(args: {
  status: WebContainerProviderStatus
  error?: string | null
}): WebContainerStatus {
  const availability = resolveRuntimeAvailability(args)

  if (availability.phase === 'idle') {
    return getDefaultWebContainerStatus()
  }

  if (availability.phase === 'error') {
    return {
      phase: 'error',
      ...(availability.detail ? { lastError: availability.detail } : {}),
    }
  }

  return { phase: availability.phase }
}

export function getDefaultThreadState(): ThreadState {
  return {
    phase: 'idle',
    hasActivePlanningSession: false,
    hasApprovedPlan: false,
    hasRunningAgentRun: false,
    webcontainerStatus: getDefaultWebContainerStatus(),
  }
}

export function createInitialRoutingInput(args: {
  message: string
  requestedMode: ChatMode
  threadState: ThreadState
  oversightLevel: 'review' | 'autopilot'
  manualOverride?: boolean
}): RoutingInput {
  return {
    message: args.message,
    requestedMode: args.requestedMode,
    resolvedMode: args.requestedMode,
    threadState: args.threadState,
    oversightLevel: args.oversightLevel,
    manualOverride: args.manualOverride ?? false,
    webcontainerStatus: args.threadState.webcontainerStatus,
  }
}

export function buildManualRoutingDecision(input: RoutingInput): RoutingDecision {
  return {
    requestedMode: input.requestedMode,
    resolvedMode: input.requestedMode,
    agent: input.requestedMode,
    confidence: 'high',
    rationale: 'Manual mode selection was used.',
    requiresApproval: false,
    webcontainerRequired: false,
    suggestedSkills: [],
    source: 'manual_override',
  }
}
