import { describe, expect, it } from 'bun:test'

import { resolveBackgroundExecutionPolicy } from './backgroundExecution'

describe('resolveBackgroundExecutionPolicy', () => {
  it('runs ask mode specs with auto-approval and inline review UI enabled', () => {
    expect(resolveBackgroundExecutionPolicy('ask')).toEqual({
      harnessSpecApprovalMode: 'auto_approve',
      autoOpenInspectorOnExecutionStart: false,
      autoOpenInspectorOnPlanExecution: false,
      showInlinePlanReview: true,
      showInlineSpecReview: true,
      showInlineRunTimeline: true,
    })
  })

  it('runs architect mode with auto-approval and inline review UI enabled', () => {
    expect(resolveBackgroundExecutionPolicy('architect')).toEqual({
      harnessSpecApprovalMode: 'auto_approve',
      autoOpenInspectorOnExecutionStart: false,
      autoOpenInspectorOnPlanExecution: false,
      showInlinePlanReview: true,
      showInlineSpecReview: true,
      showInlineRunTimeline: true,
    })
  })

  it('runs code mode with auto-approval and inline review UI enabled', () => {
    expect(resolveBackgroundExecutionPolicy('code')).toEqual({
      harnessSpecApprovalMode: 'auto_approve',
      autoOpenInspectorOnExecutionStart: false,
      autoOpenInspectorOnPlanExecution: false,
      showInlinePlanReview: true,
      showInlineSpecReview: true,
      showInlineRunTimeline: true,
    })
  })

  it('runs build mode with auto-approval and inline review UI enabled', () => {
    expect(resolveBackgroundExecutionPolicy('build')).toEqual({
      harnessSpecApprovalMode: 'auto_approve',
      autoOpenInspectorOnExecutionStart: false,
      autoOpenInspectorOnPlanExecution: false,
      showInlinePlanReview: true,
      showInlineSpecReview: true,
      showInlineRunTimeline: true,
    })
  })
})
