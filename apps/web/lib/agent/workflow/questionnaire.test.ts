import { describe, expect, test } from 'bun:test'
import { isRecommendedOption, validateQuestionnaireRequest } from './questionnaire'

describe('workflow questionnaire', () => {
  test('validates one or more structured user questions', () => {
    const errors = validateQuestionnaireRequest({
      questions: [
        {
          id: 'storage',
          prompt: 'Where should artifacts be stored?',
          recommended: 'convex',
          options: [
            { value: 'convex', label: 'Convex' },
            { value: 'workspace', label: 'Workspace files' },
          ],
        },
      ],
    })

    expect(errors).toEqual([])
  })

  test('rejects ambiguous malformed questions', () => {
    const errors = validateQuestionnaireRequest({
      questions: [
        {
          id: 'dup',
          prompt: '',
          options: [{ value: 'a', label: 'A' }],
        },
        {
          id: 'dup',
          prompt: 'Duplicate?',
          options: [
            { value: 'a', label: 'A' },
            { value: 'a', label: 'Again' },
          ],
        },
      ],
    })

    expect(errors.some((error) => error.includes('duplicated'))).toBe(true)
    expect(errors.some((error) => error.includes('missing a prompt'))).toBe(true)
    expect(errors.some((error) => error.includes('at least two options'))).toBe(true)
    expect(errors.some((error) => error.includes('recommended option'))).toBe(true)
  })

  test('detects recommended single and multi-select options', () => {
    expect(
      isRecommendedOption(
        { id: 'q', prompt: 'Pick', recommended: 'a', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
        'a'
      )
    ).toBe(true)
    expect(
      isRecommendedOption(
        { id: 'q', prompt: 'Pick', recommended: ['a', 'b'], options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
        'b'
      )
    ).toBe(true)
  })
})
