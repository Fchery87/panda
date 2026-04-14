import type { AcceptanceCriterion } from './types'
import type {
  ForgeAcceptanceCriterion,
  AcceptanceCriterionStatus,
  VerificationMethod,
} from '../../forge/types'

const SPEC_TO_FORGE_METHOD: Record<
  AcceptanceCriterion['verificationMethod'],
  VerificationMethod
> = {
  automated: 'unit',
  'llm-judge': 'review',
  manual: 'manual',
}

const FORGE_TO_SPEC_METHOD: Record<
  VerificationMethod,
  AcceptanceCriterion['verificationMethod']
> = {
  unit: 'automated',
  integration: 'automated',
  e2e: 'automated',
  review: 'llm-judge',
  manual: 'manual',
}

const SPEC_TO_FORGE_STATUS: Record<
  AcceptanceCriterion['status'],
  AcceptanceCriterionStatus
> = {
  pending: 'pending',
  passed: 'passed',
  failed: 'failed',
  skipped: 'waived',
}

const FORGE_TO_SPEC_STATUS: Record<
  AcceptanceCriterionStatus,
  AcceptanceCriterion['status']
> = {
  pending: 'pending',
  passed: 'passed',
  failed: 'failed',
  waived: 'skipped',
}

export function toForgeAcceptance(spec: AcceptanceCriterion): ForgeAcceptanceCriterion {
  return {
    id: spec.id,
    text: `WHEN ${spec.trigger} THEN the system SHALL ${spec.behavior}`,
    status: SPEC_TO_FORGE_STATUS[spec.status],
    verificationMethod: SPEC_TO_FORGE_METHOD[spec.verificationMethod],
  }
}

export function toSpecAcceptance(forge: ForgeAcceptanceCriterion): AcceptanceCriterion {
  const { trigger, behavior } = splitEarsText(forge.text)
  return {
    id: forge.id,
    trigger,
    behavior,
    verificationMethod: FORGE_TO_SPEC_METHOD[forge.verificationMethod],
    status: FORGE_TO_SPEC_STATUS[forge.status],
  }
}

export interface BridgedAcceptance {
  spec: AcceptanceCriterion
  forgeMethodHint?: VerificationMethod
}

export function fromForgeWithHint(forge: ForgeAcceptanceCriterion): BridgedAcceptance {
  return { spec: toSpecAcceptance(forge), forgeMethodHint: forge.verificationMethod }
}

export function toForgeAcceptanceWithHint(
  bridged: BridgedAcceptance
): ForgeAcceptanceCriterion {
  const base = toForgeAcceptance(bridged.spec)
  return bridged.forgeMethodHint
    ? { ...base, verificationMethod: bridged.forgeMethodHint }
    : base
}

function splitEarsText(text: string): { trigger: string; behavior: string } {
  const match = /^WHEN\s+(.*?)\s+THEN the system SHALL\s+(.*)$/i.exec(text.trim())
  if (!match) {
    return { trigger: '', behavior: text.trim() }
  }
  return { trigger: match[1].trim(), behavior: match[2].trim() }
}
