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
    ).toEqual(['explorer', 'workspace', 'chat', 'inspector'])
  })

  test('keeps the rendered education surface fields stable', () => {
    expect(interfaceMap.map((section) => section.iconKey)).toEqual([
      'explorer',
      'workspace',
      'chat',
      'inspector',
    ])

    expect(interfaceMap.map((section) => section.bullets)).toEqual([
      [
        'Project-aware file tree navigation',
        'Search when structure is not enough',
        'Selected files route into editor and chat context',
      ],
      [
        'Tabbed editor and changed-work review',
        'Browser runtime with server fallback',
        'Terminal and preview beside the task thread',
      ],
      [
        'Canonical mode, model, and context controls',
        'Plan review and build handoff in-thread',
        'Permission gates before risky actions',
      ],
      ['Run events, receipts, and checkpoints', 'Plans, changes, memory, evals, and preview'],
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
