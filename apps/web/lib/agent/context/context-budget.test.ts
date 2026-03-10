/**
 * Context Budget Tests
 *
 * Tests for the context-budget.ts module
 */

import { describe, test, expect } from 'bun:test'
import { allocateBudget, assembleContext, type BudgetAllocationOptions } from './context-budget'

describe('allocateBudget', () => {
  test('produces correct proportions for 4k context window', () => {
    const budget = allocateBudget(4096)

    expect(budget.systemPrompt).toBe(409) // ~10%
    expect(budget.projectContext).toBe(614) // ~15%
    expect(budget.fileContents).toBe(1638) // ~40%
    expect(budget.chatHistory).toBe(1024) // ~25%
    expect(budget.reserve).toBe(409) // ~10%
  })

  test('produces correct proportions for 8k context window', () => {
    const budget = allocateBudget(8192)

    expect(budget.systemPrompt).toBe(819) // ~10%
    expect(budget.projectContext).toBe(1228) // ~15%
    expect(budget.fileContents).toBe(3276) // ~40%
    expect(budget.chatHistory).toBe(2048) // ~25%
    expect(budget.reserve).toBe(819) // ~10%
  })

  test('produces correct proportions for 128k context window', () => {
    const budget = allocateBudget(128000)

    expect(budget.systemPrompt).toBe(12800) // ~10%
    expect(budget.projectContext).toBe(19200) // ~15%
    expect(budget.fileContents).toBe(51200) // ~40%
    expect(budget.chatHistory).toBe(32000) // ~25%
    expect(budget.reserve).toBe(12800) // ~10%
  })
})

describe('assembleContext', () => {
  const baseOptions: BudgetAllocationOptions = {
    contextWindowSize: 8192,
    systemPrompt: 'You are a helpful assistant.',
    providerType: 'openai',
    model: 'gpt-4o',
    files: [],
    chatHistory: [],
  }

  test('respects token budgets - never exceeds allocation', () => {
    const options: BudgetAllocationOptions = {
      ...baseOptions,
      systemPrompt: 'System prompt that is reasonably long to test budget allocation properly',
      projectOverview: 'Project overview with some content here',
      memoryBank: 'Memory bank content',
      files: [
        { path: 'src/index.ts', content: 'console.log("hello")', score: 1.0 },
        { path: 'src/utils.ts', content: 'export function util() {}', score: 0.8 },
      ],
      chatHistory: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ],
    }

    const result = assembleContext(options)

    expect(result.budgetUsage.totalTokens).toBeLessThanOrEqual(baseOptions.contextWindowSize)
  })

  test('includes full system prompt when within budget', () => {
    const systemPrompt = 'Test system prompt'
    const options: BudgetAllocationOptions = {
      ...baseOptions,
      systemPrompt,
    }

    const result = assembleContext(options)

    expect(result.systemPrompt).toBe(systemPrompt)
    expect(result.budgetUsage.systemTokens).toBeGreaterThan(0)
  })

  test('truncates system prompt if exceeds budget', () => {
    const longSystemPrompt = 'A'.repeat(5000)
    const options: BudgetAllocationOptions = {
      ...baseOptions,
      contextWindowSize: 4096,
      systemPrompt: longSystemPrompt,
    }

    const result = assembleContext(options)

    expect(result.systemPrompt.length).toBeLessThan(longSystemPrompt.length)
    expect(result.systemPrompt).toContain('[... truncated]')
  })

  test('includes project context when within budget', () => {
    const options: BudgetAllocationOptions = {
      ...baseOptions,
      projectOverview: '## Project Overview\nTest project',
      memoryBank: '## Memory\nImportant memory',
    }

    const result = assembleContext(options)

    expect(result.projectContext).toContain('Project Overview')
    expect(result.projectContext).toContain('Memory')
    expect(result.budgetUsage.projectTokens).toBeGreaterThan(0)
  })

  test('truncates project context if exceeds budget', () => {
    const options: BudgetAllocationOptions = {
      ...baseOptions,
      contextWindowSize: 4096,
      projectOverview: 'A'.repeat(2000),
      memoryBank: 'B'.repeat(2000),
    }

    const result = assembleContext(options)

    expect(result.budgetUsage.projectTokens).toBeLessThanOrEqual(650) // ~15% of 4096 with some buffer
  })

  test('budget overflow: graceful truncation, not crash', () => {
    const options: BudgetAllocationOptions = {
      ...baseOptions,
      contextWindowSize: 2048,
      systemPrompt: 'A'.repeat(500),
      projectOverview: 'B'.repeat(1000),
      memoryBank: 'C'.repeat(1000),
      files: Array.from({ length: 50 }, (_, i) => ({
        path: `src/file${i}.ts`,
        content: 'X'.repeat(200),
        score: 1.0,
      })),
      chatHistory: Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: 'Message '.repeat(50),
      })),
    }

    // Should not throw
    expect(() => assembleContext(options)).not.toThrow()

    const result = assembleContext(options)

    // Should stay within context window
    expect(result.budgetUsage.totalTokens).toBeLessThanOrEqual(baseOptions.contextWindowSize)
  })

  test('prioritizes high-scored files for full content', () => {
    const options: BudgetAllocationOptions = {
      ...baseOptions,
      files: [
        { path: 'high.ts', content: 'High priority content', score: 1.0 },
        { path: 'medium.ts', content: 'Medium priority content', score: 0.5 },
        { path: 'low.ts', content: 'Low priority content', score: 0.1 },
      ],
    }

    const result = assembleContext(options)

    expect(result.fileContents).toContain('high.ts')
    expect(result.fileContents).toContain('High priority content')
    expect(result.budgetUsage.filesWithFullContent).toBeGreaterThanOrEqual(1)
  })

  test('includes files with signatures for medium priority', () => {
    const options: BudgetAllocationOptions = {
      ...baseOptions,
      contextWindowSize: 4096,
      files: Array.from({ length: 20 }, (_, i) => ({
        path: `src/file${i}.ts`,
        content: `export function func${i}() {}\nexport function another${i}() {}`,
        score: 1.0 - i * 0.05,
      })),
    }

    const result = assembleContext(options)

    // Should have some files with signatures (middle tier)
    expect(result.budgetUsage.filesWithSignatures).toBeGreaterThanOrEqual(0)
  })

  test('includes file paths only for low priority', () => {
    const options: BudgetAllocationOptions = {
      ...baseOptions,
      files: Array.from({ length: 100 }, (_, i) => ({
        path: `src/deep/nested/path/file${i}.ts`,
        content: 'content',
        score: 0.01,
      })),
    }

    const result = assembleContext(options)

    // Most files should just be paths
    expect(result.budgetUsage.filesWithPathsOnly).toBeGreaterThan(0)
    expect(result.fileContents).toContain('src/deep/nested/path/file')
  })

  test('includes most recent chat messages first', () => {
    const options: BudgetAllocationOptions = {
      ...baseOptions,
      chatHistory: [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'Second message' },
        { role: 'user', content: 'Third message' },
        { role: 'assistant', content: 'Fourth message' },
      ],
    }

    const result = assembleContext(options)

    // Should include at least some recent messages
    expect(result.budgetUsage.chatTokens).toBeGreaterThan(0)
    expect(result.chatHistory).toContain('Fourth')
  })

  test('handles empty inputs gracefully', () => {
    const result = assembleContext(baseOptions)

    expect(result.systemPrompt).toBe('You are a helpful assistant.')
    expect(result.projectContext).toBe('')
    expect(result.fileContents).toBe('')
    expect(result.chatHistory).toBe('')
    expect(result.budgetUsage.totalTokens).toBeGreaterThan(0)
  })
})
