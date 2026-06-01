import { describe, expect, test } from 'bun:test'

import { educationSections, interfaceMap, landingFeatures } from './capabilities'

describe('landingFeatures', () => {
  test('keeps the marketing feature order stable', () => {
    expect(landingFeatures.map((feature) => feature.id)).toEqual([
      'plan-review',
      'artifacts',
      'runs',
      'approvals',
    ])
  })
})

describe('educationSections', () => {
  test('keeps the education surface order stable', () => {
    expect(
      educationSections.filter((section) => section.id !== 'workflow').map((section) => section.id)
    ).toEqual(['explorer', 'work', 'chat', 'inspector'])
  })

  test('keeps the rendered education surface fields stable', () => {
    expect(interfaceMap.map((section) => section.iconKey)).toEqual([
      'explorer',
      'work',
      'chat',
      'inspector',
    ])

    expect(interfaceMap.map((section) => section.bullets)).toEqual([
      [
        'Project-aware file tree navigation',
        'Search when structure is not enough',
        'Selected files open in Editor and attach to chat context',
      ],
      [
        'Tabbed editor and changed-work review',
        'Browser runtime with server fallback',
        'Terminal output and run evidence beside the task thread',
      ],
      [
        'Ask / Plan / Agent mode controls',
        'Guided / Autopilot autonomy for Agent runs',
        'Plan review, approvals, and run status in-thread',
      ],
      [
        'Run events, receipts, and checkpoints',
        'Plans, changes, memory, delegated work, and recovery state',
      ],
    ])
  })

  test('keeps the workflow sequence stable', () => {
    const workflow = educationSections.find((section) => section.id === 'workflow')

    expect(workflow?.steps?.map((step) => step.id)).toEqual([
      'pick-context',
      'edit-and-inspect',
      'ask-panda',
      'review-and-approve',
      'inspect-or-resume',
      'share-verify-repeat',
    ])
  })
})
