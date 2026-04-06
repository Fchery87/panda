import { describe, expect, test } from 'bun:test'
import { deriveAffectedRoutes } from './route-impact'

describe('QA route impact', () => {
  test('maps project page changes to the project route', () => {
    const routes = deriveAffectedRoutes([
      'apps/web/app/(dashboard)/projects/[projectId]/page.tsx',
      'apps/web/components/panels/TaskPanel.tsx',
    ])

    expect(routes).toContain('/projects/[projectId]')
  })
})
