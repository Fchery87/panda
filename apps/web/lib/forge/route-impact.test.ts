import { describe, expect, test } from 'bun:test'
import { deriveForgeAffectedRoutes } from './route-impact'

describe('forge route impact', () => {
  test('infers app router routes from page files with route groups removed', () => {
    const routes = deriveForgeAffectedRoutes([
      'apps/web/app/(dashboard)/settings/page.tsx',
      'apps/web/app/page.tsx',
    ])

    expect(routes).toEqual(['/settings', '/'])
  })

  test('preserves dynamic route segments when inferring app router routes', () => {
    const routes = deriveForgeAffectedRoutes([
      'apps/web/app/(dashboard)/projects/[projectId]/settings/page.tsx',
    ])

    expect(routes).toEqual(['/projects/[projectId]/settings'])
  })

  test('maps project workbench files to the project route', () => {
    const routes = deriveForgeAffectedRoutes([
      'apps/web/app/(dashboard)/projects/[projectId]/page.tsx',
      'apps/web/components/panels/TaskPanel.tsx',
    ])

    expect(routes).toContain('/projects/[projectId]')
  })

  test('deduplicates affected routes', () => {
    const routes = deriveForgeAffectedRoutes([
      'apps/web/app/(dashboard)/projects/[projectId]/page.tsx',
      'apps/web/components/review/ReviewPanel.tsx',
      'apps/web/components/review/ReviewPanel.tsx',
    ])

    expect(routes).toEqual(['/projects/[projectId]'])
  })

  test('fans shared workbench components out to all mapped routes', () => {
    const routes = deriveForgeAffectedRoutes(['apps/web/components/workbench/WorkbenchShell.tsx'])

    expect(routes).toEqual(['/projects/[projectId]', '/projects/[projectId]/review'])
  })
})
