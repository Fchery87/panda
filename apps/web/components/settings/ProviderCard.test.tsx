import { cleanup, fireEvent, render } from '@testing-library/react/pure'
import { describe, expect, test } from 'bun:test'
import { JSDOM } from 'jsdom'

import { ProviderCard } from './ProviderCard'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
globalThis.window = dom.window as unknown as typeof globalThis.window
globalThis.document = dom.window.document
globalThis.navigator = dom.window.navigator
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Element = dom.window.Element

describe('ProviderCard', () => {
  test('keeps the provider switch outside the expandable button', () => {
    const changes: Array<{ enabled: boolean }> = []

    try {
      const { getByRole } = render(
        <ProviderCard
          provider={{
            name: 'Future Lab',
            description: 'Future Lab provider',
            apiKey: '',
            enabled: false,
            defaultModel: 'future-code-1',
            availableModels: ['future-code-1'],
          }}
          onChange={(update) => {
            if (typeof update.enabled === 'boolean') {
              changes.push({ enabled: update.enabled })
            }
          }}
          onTest={() => {}}
        />
      )

      const switchControl = getByRole('switch')
      const expandButton = getByRole('button', { name: /^future lab off$/i })

      expect(expandButton.contains(switchControl)).toBe(false)

      fireEvent.click(switchControl)

      expect(changes).toEqual([{ enabled: true }])
      expect(expandButton.getAttribute('aria-expanded')).toBe('false')
    } finally {
      cleanup()
    }
  })
})
