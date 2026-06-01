import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiffTab } from './DiffTab'

describe('DiffTab recovery affordance', () => {
  test('renders restore-in-proof action when proof navigation is available', () => {
    const html = renderToStaticMarkup(
      <DiffTab
        files={[
          {
            artifactId: 'artifact-1',
            path: 'src/generated.ts',
            status: 'added',
            reviewStatus: 'pending',
            hunks: [
              {
                id: 'artifact-1',
                startLine: 1,
                endLine: 1,
                added: ['export const generated = true'],
                removed: [],
                context: [],
                status: 'pending',
              },
            ],
          },
        ]}
        onOpenProof={() => {}}
      />
    )

    expect(html).toContain('Restore in Run')
    expect(html).toContain('src/generated.ts')
  })
})
