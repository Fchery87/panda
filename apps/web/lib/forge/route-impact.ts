const APP_ROUTE_PREFIX = 'apps/web/app/'

const SHARED_COMPONENT_ROUTE_MAP: ReadonlyArray<{
  filePath: string
  routes: string[]
}> = [
  {
    filePath: 'apps/web/components/panels/TaskPanel.tsx',
    routes: ['/projects/[projectId]'],
  },
  {
    filePath: 'apps/web/components/review/ReviewPanel.tsx',
    routes: ['/projects/[projectId]'],
  },
  {
    filePath: 'apps/web/components/workbench/WorkbenchShell.tsx',
    routes: ['/projects/[projectId]', '/projects/[projectId]/review'],
  },
]

function inferRouteFromAppPage(filePath: string): string | null {
  if (!filePath.startsWith(APP_ROUTE_PREFIX) || !filePath.endsWith('/page.tsx')) {
    return null
  }

  const routeSegments = filePath
    .slice(APP_ROUTE_PREFIX.length, -'/page.tsx'.length)
    .split('/')
    .filter((segment) => segment.length > 0 && !(segment.startsWith('(') && segment.endsWith(')')))

  return routeSegments.length === 0 ? '/' : `/${routeSegments.join('/')}`
}

export function deriveForgeAffectedRoutes(files: string[]): string[] {
  const routes: string[] = []
  const seenRoutes = new Set<string>()

  for (const file of files) {
    const inferredRoute = inferRouteFromAppPage(file)
    const mappedRoutes =
      SHARED_COMPONENT_ROUTE_MAP.find((entry) => entry.filePath === file)?.routes ?? []

    for (const route of [inferredRoute, ...mappedRoutes].filter(
      (value): value is string => typeof value === 'string' && value.length > 0
    )) {
      if (seenRoutes.has(route)) {
        continue
      }

      seenRoutes.add(route)
      routes.push(route)
    }
  }

  return routes
}
