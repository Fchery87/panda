import { describe, expect, it } from 'bun:test'
import { EditorState, StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'
import { getLanguageExtension, getSupportedExtensions } from './language-support'

const testEffect = StateEffect.define<null>()
const testField = StateField.define({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(testEffect)) return Decoration.none
    }
    return decorations.map(tr.changes)
  },
  provide: (field) => EditorView.decorations.from(field),
})

const testTheme = EditorView.theme({
  '.cm-content': { fontFamily: 'monospace' },
})

function toExtensionArray(extension: Awaited<ReturnType<typeof getLanguageExtension>>) {
  return Array.isArray(extension) ? extension : [extension]
}

describe('language support integration', () => {
  it('creates editor state with the resolved TypeScript extension', async () => {
    const extension = await getLanguageExtension('demo.tsx')

    expect(() =>
      EditorState.create({
        doc: 'export const value = 1\n',
        extensions: toExtensionArray(extension),
      })
    ).not.toThrow()
  })

  it('creates editor state with editor core extensions and every supported language', async () => {
    for (const ext of getSupportedExtensions()) {
      const extension = await getLanguageExtension(`demo${ext}`)

      expect(() =>
        EditorState.create({
          doc: '',
          extensions: [testField, testTheme, ...toExtensionArray(extension)],
        })
      ).not.toThrow()
    }
  })
})
