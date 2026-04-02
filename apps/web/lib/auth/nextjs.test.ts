import { describe, expect, test } from 'bun:test'

import * as auth from './nextjs'

describe('nextjs auth wrapper', () => {
  test('exports the auth helpers used by route handlers', () => {
    expect(typeof auth.isAuthenticatedNextjs).toBe('function')
    expect(typeof auth.convexAuthNextjsToken).toBe('function')
  })
})
