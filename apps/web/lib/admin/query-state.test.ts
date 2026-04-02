import { describe, expect, test } from 'bun:test'

import {
  buildAdminQueryHref,
  readAdminDateQueryParam,
  readAdminEnumQueryParam,
  readAdminQueryParam,
} from './query-state'

describe('admin query-state helpers', () => {
  test('reads query params with fallbacks', () => {
    const params = new URLSearchParams('search=panda&filter=admins&from=2026-04-01')

    expect(readAdminQueryParam(params, 'search')).toBe('panda')
    expect(readAdminQueryParam(params, 'missing', 'fallback')).toBe('fallback')
    expect(
      readAdminEnumQueryParam(params, 'filter', ['all', 'admins', 'banned'] as const, 'all')
    ).toBe('admins')
    expect(readAdminDateQueryParam(params, 'from')).toBe('2026-04-01')
    expect(readAdminDateQueryParam(params, 'to', '2026-03-31')).toBe('2026-03-31')
  })

  test('builds a URL that preserves unknown params and removes blanks', () => {
    const href = buildAdminQueryHref('/admin/users', new URLSearchParams('page=2&sort=desc'), {
      search: 'e2e@example.com',
      filter: 'admins',
      selectedUserId: 'user_123',
      sort: null,
      empty: '',
    })

    const url = new URL(href, 'http://localhost')

    expect(url.pathname).toBe('/admin/users')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('search')).toBe('e2e@example.com')
    expect(url.searchParams.get('filter')).toBe('admins')
    expect(url.searchParams.get('selectedUserId')).toBe('user_123')
    expect(url.searchParams.get('sort')).toBeNull()
    expect(url.searchParams.get('empty')).toBeNull()
  })
})
