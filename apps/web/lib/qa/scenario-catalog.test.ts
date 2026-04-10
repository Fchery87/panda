import { describe, expect, test } from 'bun:test'
import { deriveQaAssertions, deriveQaScenarioNames } from './scenario-catalog'

describe('QA scenario catalog', () => {
  test('derives route-aware scenario names deterministically', () => {
    const scenarios = deriveQaScenarioNames({
      routes: ['/projects/[projectId]', '/settings'],
      featureAreas: ['workbench'],
    })

    expect(scenarios).toEqual([
      'global-smoke',
      'project-workbench-smoke',
      'settings-smoke',
      'workbench-panel-smoke',
    ])
  })

  test('derives stable assertions for known scenarios', () => {
    const assertions = deriveQaAssertions({
      scenarioNames: ['project-workbench-smoke', 'workbench-panel-smoke'],
    })

    expect(assertions).toEqual(['Project workbench route loads', 'Workbench panels render'])
  })
})
