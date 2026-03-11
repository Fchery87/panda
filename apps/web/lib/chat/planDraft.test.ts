import { describe, expect, it } from 'bun:test'
import { extractBrainstormPhase } from './brainstorming'
import {
  buildApprovedPlanExecutionMessage,
  buildMessageWithPlanDraft,
  canApprovePlan,
  canBuildFromPlan,
  deriveNextPlanDraft,
  getNextPlanStatusAfterDraftChange,
  getNextPlanStatusAfterGeneration,
  pickLatestArchitectAssistantPlan,
} from './planDraft'

describe('planDraft helpers', () => {
  it('buildMessageWithPlanDraft prefixes plan once', () => {
    const plan = '1) Step one\n2) Step two'
    const user = 'Implement the plan'

    const first = buildMessageWithPlanDraft(plan, user)
    expect(first).toContain('Plan draft:')
    expect(first).toContain(plan)
    expect(first).toContain('User request:')
    expect(first).toContain(user)

    const second = buildMessageWithPlanDraft(plan, first)
    expect(second).toBe(first)
  })

  it('buildMessageWithPlanDraft does not re-prefix if user content already includes a plan block', () => {
    const plan = '1) Step one\n2) Step two'
    const user =
      'We are switching from Architect (Plan Mode) to Build (Execute Mode).\n\nPlan draft:\nfoo\n\nOriginal request:\nbar'

    const result = buildMessageWithPlanDraft(plan, user)
    expect(result).toBe(user)
  })

  it('buildApprovedPlanExecutionMessage produces an explicit approved-plan contract', () => {
    const plan = '1) Step one\n2) Step two'

    expect(buildApprovedPlanExecutionMessage(plan)).toBe(
      'We are switching from Architect (Plan Mode) to Build (Execute Mode).\n\nApproved plan:\n1) Step one\n2) Step two\n\nExecution contract:\n- Treat the approved plan as the primary execution contract.\n- Execute it step-by-step.\n- Use the active specification as a secondary constraint if present.\n- Report progress against the plan while implementing.\n\nOriginal request:\nExecute the approved plan.'
    )
  })

  it('buildApprovedPlanExecutionMessage returns the original request when no approved plan exists', () => {
    expect(buildApprovedPlanExecutionMessage('   ')).toBe('Execute the approved plan.')
  })

  it('pickLatestArchitectAssistantPlan returns latest architect assistant content', () => {
    const messages = [
      { role: 'user' as const, mode: 'architect' as const, content: 'q1' },
      { role: 'assistant' as const, mode: 'architect' as const, content: 'plan v1' },
      { role: 'user' as const, mode: 'build' as const, content: 'do it' },
      { role: 'assistant' as const, mode: 'build' as const, content: 'code' },
      { role: 'assistant' as const, mode: 'architect' as const, content: 'plan v2' },
    ]

    expect(pickLatestArchitectAssistantPlan(messages)).toBe('plan v2')
  })

  it('deriveNextPlanDraft only updates on architect completion and non-empty plan', () => {
    const messages = [
      { role: 'user' as const, mode: 'architect' as const, content: 'q1' },
      { role: 'assistant' as const, mode: 'architect' as const, content: 'plan v1' },
    ]

    expect(
      deriveNextPlanDraft({
        mode: 'architect',
        agentStatus: 'complete',
        currentPlanDraft: '',
        messages,
      })
    ).toBe('plan v1')

    expect(
      deriveNextPlanDraft({
        mode: 'build',
        agentStatus: 'complete',
        currentPlanDraft: '',
        messages,
      })
    ).toBeNull()

    expect(
      deriveNextPlanDraft({
        mode: 'architect',
        agentStatus: 'streaming',
        currentPlanDraft: '',
        messages,
      })
    ).toBeNull()

    expect(
      deriveNextPlanDraft({
        mode: 'architect',
        agentStatus: 'complete',
        currentPlanDraft: 'plan v1',
        messages,
      })
    ).toBeNull()
  })

  it('extractBrainstormPhase parses the marker line', () => {
    expect(
      extractBrainstormPhase('Brainstorm phase: discovery\n\nQuestion: preferred stack?')
    ).toBe('discovery')
    expect(
      extractBrainstormPhase(
        'Some intro text\nBrainstorm phase: options\n\nOption A/B/C with recommendation'
      )
    ).toBe('options')
    expect(extractBrainstormPhase('No marker here')).toBeNull()
  })

  it('deriveNextPlanDraft gates architect persistence until validated phase when enabled', () => {
    const unvalidated = [
      { role: 'user' as const, mode: 'architect' as const, content: 'help me plan auth' },
      {
        role: 'assistant' as const,
        mode: 'architect' as const,
        content: 'Brainstorm phase: discovery\n\nQuestion: Which auth provider do you prefer?',
      },
    ]

    expect(
      deriveNextPlanDraft({
        mode: 'architect',
        agentStatus: 'complete',
        currentPlanDraft: '',
        messages: unvalidated,
        requireValidatedBrainstorm: true,
      })
    ).toBeNull()

    const validated = [
      ...unvalidated,
      { role: 'user' as const, mode: 'architect' as const, content: 'Use Better Auth.' },
      {
        role: 'assistant' as const,
        mode: 'architect' as const,
        content:
          'Brainstorm phase: validated_plan\n\n1) Clarifying questions\n2) Proposed plan\n3) Risks\n4) Next step',
      },
    ]

    expect(
      deriveNextPlanDraft({
        mode: 'architect',
        agentStatus: 'complete',
        currentPlanDraft: '',
        messages: validated,
        requireValidatedBrainstorm: true,
      })
    ).toBe('1) Clarifying questions\n2) Proposed plan\n3) Risks\n4) Next step')
  })

  it('marks approved and executing plans as stale when the draft changes', () => {
    expect(
      getNextPlanStatusAfterDraftChange({
        previousDraft: 'old plan',
        nextDraft: 'new plan',
        currentStatus: 'approved',
      })
    ).toBe('stale')

    expect(
      getNextPlanStatusAfterDraftChange({
        previousDraft: 'old plan',
        nextDraft: 'new plan',
        currentStatus: 'executing',
      })
    ).toBe('stale')
  })

  it('keeps status unchanged when the draft text is unchanged after normalization', () => {
    expect(
      getNextPlanStatusAfterDraftChange({
        previousDraft: 'plan\n',
        nextDraft: 'plan',
        currentStatus: 'approved',
      })
    ).toBe('approved')
  })

  it('marks generated architect output as awaiting review when it changes the plan', () => {
    expect(
      getNextPlanStatusAfterGeneration({
        previousDraft: 'old plan',
        nextDraft: 'new plan',
        currentStatus: 'approved',
      })
    ).toBe('awaiting_review')
  })

  it('does not update generated plan status when the generated draft is empty or unchanged', () => {
    expect(
      getNextPlanStatusAfterGeneration({
        previousDraft: 'same plan',
        nextDraft: 'same plan',
        currentStatus: 'drafting',
      })
    ).toBeNull()

    expect(
      getNextPlanStatusAfterGeneration({
        previousDraft: 'same plan',
        nextDraft: '   ',
        currentStatus: 'drafting',
      })
    ).toBeNull()
  })

  it('only allows approval when a non-empty draft is ready for review or stale', () => {
    expect(canApprovePlan('awaiting_review', 'plan')).toBe(true)
    expect(canApprovePlan('stale', 'plan')).toBe(true)
    expect(canApprovePlan('drafting', 'plan')).toBe(false)
    expect(canApprovePlan('approved', 'plan')).toBe(false)
    expect(canApprovePlan('awaiting_review', '   ')).toBe(false)
  })

  it('only allows build when a non-empty draft is approved or executing', () => {
    expect(canBuildFromPlan('approved', 'plan')).toBe(true)
    expect(canBuildFromPlan('executing', 'plan')).toBe(true)
    expect(canBuildFromPlan('stale', 'plan')).toBe(false)
    expect(canBuildFromPlan('approved', '')).toBe(false)
  })
})
