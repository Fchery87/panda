/**
 * Tests for enhance-prompt module
 *
 * @file apps/web/lib/agent/enhance-prompt.test.ts
 */

import { describe, test, expect } from 'bun:test'
import {
  cleanMarkdownFences,
  buildEnhancementPrompt,
  ENHANCE_PROMPT_TEMPLATE,
  ENHANCE_SYSTEM_PROMPT,
} from './enhance-prompt'

describe('cleanMarkdownFences', () => {
  test('removes triple backtick code blocks', () => {
    const input = '```typescript\nconst x = 1\n```'
    expect(cleanMarkdownFences(input)).toBe('const x = 1')
  })

  test('removes triple backticks without language', () => {
    const input = '```\nHello world\n```'
    expect(cleanMarkdownFences(input)).toBe('Hello world')
  })

  test('removes single backtick wrapping', () => {
    const input = '`enhanced prompt`'
    expect(cleanMarkdownFences(input)).toBe('enhanced prompt')
  })

  test('trims whitespace', () => {
    const input = '  \n  hello world  \n  '
    expect(cleanMarkdownFences(input)).toBe('hello world')
  })

  test('handles plain text without fences', () => {
    const input = 'Just a regular prompt'
    expect(cleanMarkdownFences(input)).toBe('Just a regular prompt')
  })

  test('handles mixed fences', () => {
    const input = '```\n`nested`\n```'
    expect(cleanMarkdownFences(input)).toBe('`nested`')
  })
})

describe('buildEnhancementPrompt', () => {
  test('inserts user input into template', () => {
    const userInput = 'fix the login bug'
    const result = buildEnhancementPrompt(userInput)

    expect(result).toContain(userInput)
    expect(result).toContain('Rewrite the following user prompt')
  })

  test('handles multi-line user input', () => {
    const userInput = 'Line 1\nLine 2\nLine 3'
    const result = buildEnhancementPrompt(userInput)

    expect(result).toContain('Line 1')
    expect(result).toContain('Line 2')
    expect(result).toContain('Line 3')
  })

  test('handles empty string', () => {
    const userInput = ''
    const result = buildEnhancementPrompt(userInput)

    // When input is empty, placeholder is replaced with empty string
    expect(result).not.toContain('PROMPT_PLACEHOLDER')
    expect(result).toContain('User prompt:')
  })
})

describe('ENHANCE_PROMPT_TEMPLATE', () => {
  test('contains expected instructions', () => {
    expect(ENHANCE_PROMPT_TEMPLATE).toContain('clearer, more specific, and more actionable')
    expect(ENHANCE_PROMPT_TEMPLATE).toContain('Preserve the user')
    expect(ENHANCE_PROMPT_TEMPLATE).toContain('PROMPT_PLACEHOLDER')
  })
})

describe('ENHANCE_SYSTEM_PROMPT', () => {
  test('contains expected guidelines', () => {
    expect(ENHANCE_SYSTEM_PROMPT).toContain('prompt improvement assistant')
    expect(ENHANCE_SYSTEM_PROMPT).toContain('Preserve the user')
    expect(ENHANCE_SYSTEM_PROMPT).toContain('Return ONLY')
  })
})
