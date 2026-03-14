import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('admin real data fallbacks', () => {
  test('falls back to source-of-truth counts when userAnalytics is missing', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'admin.ts'), 'utf8')

    expect(source).toContain('projectCountByUser')
    expect(source).toContain('countChatsByUser')
    expect(source).toContain('analytics?.totalProjects ?? projectCountByUser.get(user._id) ?? 0')
    expect(source).toContain('analytics?.totalChats ?? chatCount')
    expect(source).toContain('const recentRunUsers = new Set(')
  })
})
