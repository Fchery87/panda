import { describe, expect, test } from 'bun:test'
import { deriveForgeAffectedRoutes } from './route-impact'

describe('forge route impact', () => {
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
})
