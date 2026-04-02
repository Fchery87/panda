import { describe, expect, test } from 'bun:test'
import { getDefaultPolicyForMode } from '@/lib/agent/automationPolicy'
import {
  buildSettingsTabHref,
  createSettingsSignature,
  getSettingsTabFromSearchParams,
} from './settings-navigation'

describe('settings navigation helpers', () => {
  test('defaults to the general tab when the query is missing or invalid', () => {
    expect(getSettingsTabFromSearchParams(new URLSearchParams())).toBe('general')
    expect(getSettingsTabFromSearchParams(new URLSearchParams('tab=unknown'))).toBe('general')
  })

  test('builds a tab href without dropping unrelated query parameters', () => {
    const href = buildSettingsTabHref(
      '/settings',
      new URLSearchParams('foo=bar&tab=general'),
      'providers'
    )

    expect(href).toBe('/settings?foo=bar&tab=providers')
  })

  test('removes the tab query when navigating back to the default tab', () => {
    const href = buildSettingsTabHref(
      '/settings',
      new URLSearchParams('foo=bar&tab=providers'),
      'general'
    )

    expect(href).toBe('/settings?foo=bar')
  })

  test('treats test-only provider fields as non-dirty state', () => {
    const snapshot = {
      theme: 'system' as const,
      language: 'en',
      defaultProvider: 'openai',
      defaultModel: 'gpt-4o-mini',
      providers: {
        openai: {
          apiKey: '',
          enabled: false,
          defaultModel: 'gpt-4o-mini',
          availableModels: ['gpt-4o-mini'],
        },
      },
      overrideGlobalProvider: false,
      overrideGlobalModel: false,
      agentDefaults: getDefaultPolicyForMode('code'),
    }

    const next = {
      ...snapshot,
      providers: {
        openai: {
          ...snapshot.providers.openai,
          testStatus: 'testing' as const,
          testStatusMessage: 'still testing',
        },
      },
    }

    expect(createSettingsSignature(snapshot)).toBe(createSettingsSignature(next))
  })

  test('changes when a meaningful setting changes', () => {
    const base = {
      theme: 'system' as const,
      language: 'en',
      defaultProvider: 'openai',
      defaultModel: 'gpt-4o-mini',
      providers: {
        openai: {
          apiKey: '',
          enabled: false,
          defaultModel: 'gpt-4o-mini',
          availableModels: ['gpt-4o-mini'],
        },
      },
      overrideGlobalProvider: false,
      overrideGlobalModel: false,
      agentDefaults: getDefaultPolicyForMode('code'),
    }

    const next = {
      ...base,
      language: 'fr',
    }

    expect(createSettingsSignature(base)).not.toBe(createSettingsSignature(next))
  })
})
