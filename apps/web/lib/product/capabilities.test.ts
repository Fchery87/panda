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
      ['File tree navigation', 'Project search panel', 'Fast file selection for editor + chat'],
      [
        'Tabbed editor + diff review',
        'Integrated terminal + preview',
        'Responsive workbench shell',
      ],
      [
        'Message history + streaming input',
        'Mode, model, and file-context controls',
        'Planning, approval, and build actions',
      ],
      ['Run proof and recovery', 'Changes, context, and preview rails'],
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
