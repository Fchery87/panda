import { describe, expect, it } from 'bun:test'
import { getCreateProjectErrorDisplay } from './create-project-errors'

describe('getCreateProjectErrorDisplay', () => {
  it('promotes project limit failures into a direct user-facing message', () => {
    const display = getCreateProjectErrorDisplay(
      new Error(
        'Project limit reached. You have 100 projects (maximum: 100). Please delete an existing project before creating a new one.'
      )
    )

    expect(display.title).toBe('Project limit reached')
    expect(display.description).toContain('delete an existing project')
    expect(display.recoveryHint).toContain('Delete or archive')
  })

  it('falls back to a generic creation error for unknown failures', () => {
    const display = getCreateProjectErrorDisplay(new Error('Database unavailable'))

    expect(display.title).toBe('Failed to create project')
    expect(display.description).toBe('Database unavailable')
    expect(display.recoveryHint).toBeNull()
  })
})
