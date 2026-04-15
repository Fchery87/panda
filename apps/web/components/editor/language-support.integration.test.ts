import { describe, expect, it } from 'bun:test'
import { EditorState } from '@codemirror/state'
import { getLanguageExtension } from './language-support'

describe('language support integration', () => {
  it('creates editor state with the resolved TypeScript extension', async () => {
    const extension = await getLanguageExtension('demo.tsx')

    expect(() =>
      EditorState.create({
        doc: 'export const value = 1\n',
        extensions: Array.isArray(extension) ? extension : [extension],
      })
    ).not.toThrow()
  })
})
