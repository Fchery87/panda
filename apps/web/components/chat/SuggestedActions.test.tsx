'use client'

import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { SuggestedActions } from './SuggestedActions'

describe('SuggestedActions', () => {
  test('renders retry action for each failed acceptance criterion', () => {
    const markup = renderToStaticMarkup(
      <SuggestedActions
        actions={[]}
        failedCriteria={[{ id: 'a1', description: 'login works' }]}
        onAction={() => {}}
      />
    )

    expect(markup).toContain('Fix: login works')
  })
})
