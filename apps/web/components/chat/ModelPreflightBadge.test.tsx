import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { ModelPreflightBadge } from './ModelPreflightBadge'

describe('ModelPreflightBadge', () => {
  test('renders provider capability preflight details before execution', () => {
    const html = renderToStaticMarkup(
      <ModelPreflightBadge
        preflight={{
          tone: 'warning',
          modelLabel: 'custom / unknown-model',
          modeSupport: 'Code mode needs tool support; this model is unverified.',
          toolGrammar: 'Tool grammar: no verified grammar',
          context: 'Context: 32000 tokens from fallback estimate',
          cost: 'Cost visibility: pricing unavailable',
          reasoning: 'Reasoning: unknown',
          notes: ['Use Ask or Plan first if tool execution is uncertain.'],
        }}
      />
    )

    expect(html).toContain('Provider preflight')
    expect(html).toContain('custom / unknown-model')
    expect(html).toContain('Code mode needs tool support; this model is unverified.')
    expect(html).toContain('Tool grammar: no verified grammar')
    expect(html).toContain('Context: 32000 tokens from fallback estimate')
    expect(html).toContain('Cost visibility: pricing unavailable')
    expect(html).toContain('Reasoning: unknown')
  })
})
