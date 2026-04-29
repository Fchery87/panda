import { describe, expect, test } from 'bun:test'
import type { Id } from '@convex/_generated/dataModel'

import { PROJECT_BOOT_QUERY_SHAPES, getProjectBootQueryArgs } from './query-shapes'

describe('Convex query shapes', () => {
  test('keeps project boot on summary-shaped file and chat queries', () => {
    const projectId = 'project_123' as Id<'projects'>
    const args = getProjectBootQueryArgs(projectId)

    expect(PROJECT_BOOT_QUERY_SHAPES.files.shape).toBe('summary')
    expect(PROJECT_BOOT_QUERY_SHAPES.files.payload).toBe('metadata')
    expect(PROJECT_BOOT_QUERY_SHAPES.chats.shape).toBe('summary')
    expect(PROJECT_BOOT_QUERY_SHAPES.chats.payload).toBe('recent')
    expect(args.files.projectId).toBe(projectId)
    expect(args.chats.limit).toBe(25)
  })
})
