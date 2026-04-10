const ROUTE_SCENARIO_MAP: ReadonlyArray<{
  route: string
  scenarioName: string
}> = [
  { route: '/projects/[projectId]', scenarioName: 'project-workbench-smoke' },
  { route: '/settings', scenarioName: 'settings-smoke' },
]

const FEATURE_SCENARIO_MAP: ReadonlyArray<{
  featureArea: string
  scenarioName: string
}> = [{ featureArea: 'workbench', scenarioName: 'workbench-panel-smoke' }]

const SCENARIO_ASSERTION_MAP: ReadonlyArray<{
  scenarioName: string
  assertion: string
}> = [
  { scenarioName: 'project-workbench-smoke', assertion: 'Project workbench route loads' },
  { scenarioName: 'settings-smoke', assertion: 'Settings route loads' },
  { scenarioName: 'workbench-panel-smoke', assertion: 'Workbench panels render' },
]

export function deriveQaScenarioNames(args: {
  routes: string[]
  featureAreas?: string[]
}): string[] {
  const scenarioNames = new Set<string>(['global-smoke'])

  for (const route of args.routes) {
    const scenarioName = ROUTE_SCENARIO_MAP.find((entry) => entry.route === route)?.scenarioName
    if (scenarioName) {
      scenarioNames.add(scenarioName)
    }
  }

  for (const featureArea of args.featureAreas ?? []) {
    const scenarioName = FEATURE_SCENARIO_MAP.find(
      (entry) => entry.featureArea === featureArea
    )?.scenarioName
    if (scenarioName) {
      scenarioNames.add(scenarioName)
    }
  }

  return [...scenarioNames]
}

export function deriveQaAssertions(args: { scenarioNames: string[] }): string[] {
  const assertions: string[] = []
  const seenAssertions = new Set<string>()

  for (const scenarioName of args.scenarioNames) {
    const assertion = SCENARIO_ASSERTION_MAP.find(
      (entry) => entry.scenarioName === scenarioName
    )?.assertion

    if (!assertion || seenAssertions.has(assertion)) {
      continue
    }

    seenAssertions.add(assertion)
    assertions.push(assertion)
  }

  return assertions
}
