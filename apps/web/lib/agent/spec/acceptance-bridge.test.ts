import { describe, expect, it } from 'bun:test'
import type { AcceptanceCriterion } from './types'
import type { ForgeAcceptanceCriterion } from '../../forge/types'
import {
  toForgeAcceptance,
  fromForgeWithHint,
  toForgeAcceptanceWithHint,
} from './acceptance-bridge'

describe('acceptance-bridge', () => {
  it('maps spec automated → forge unit by default', () => {
    const spec: AcceptanceCriterion = {
      id: 'ac-1',
      trigger: 'user submits form',
      behavior: 'the system validates input',
      verificationMethod: 'automated',
      status: 'pending',
    }
    const forge = toForgeAcceptance(spec)
    expect(forge.id).toBe('ac-1')
    expect(forge.text).toContain('user submits form')
    expect(forge.text).toContain('the system validates input')
    expect(forge.verificationMethod).toBe('unit')
    expect(forge.status).toBe('pending')
  })

  it('maps spec llm-judge → forge review', () => {
    const spec: AcceptanceCriterion = {
      id: 'ac-2',
      trigger: 'a PR is opened',
      behavior: 'reviewer summary is generated',
      verificationMethod: 'llm-judge',
      status: 'passed',
    }
    const forge = toForgeAcceptance(spec)
    expect(forge.verificationMethod).toBe('review')
    expect(forge.status).toBe('passed')
  })

  it('maps spec manual → forge manual', () => {
    const spec: AcceptanceCriterion = {
      id: 'ac-3',
      trigger: 'release cut',
      behavior: 'operator confirms ship',
      verificationMethod: 'manual',
      status: 'skipped',
    }
    expect(toForgeAcceptance(spec).verificationMethod).toBe('manual')
    expect(toForgeAcceptance(spec).status).toBe('waived')
  })

  it('round-trips forge → spec → forge preserving method and text', () => {
    const forge: ForgeAcceptanceCriterion = {
      id: 'ac-4',
      text: 'WHEN a build completes THEN the system SHALL emit artifacts',
      status: 'passed',
      verificationMethod: 'integration',
    }
    const bridged = fromForgeWithHint(forge)
    const roundTrip = toForgeAcceptanceWithHint(bridged)
    expect(roundTrip.id).toBe(forge.id)
    expect(roundTrip.verificationMethod).toBe('integration')
    expect(roundTrip.status).toBe('passed')
    expect(roundTrip.text).toBe(forge.text)
  })
})
