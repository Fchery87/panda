import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ArtifactCard } from './ArtifactCard'

describe('ArtifactCard navigation actions', () => {
  test('renders file navigation actions for file-write artifacts', () => {
    const html = renderToStaticMarkup(
      <ArtifactCard
        artifact={{
          id: 'artifact-1',
          type: 'file_write',
          payload: {
            filePath: 'src/generated.ts',
            content: 'export const generated = true\n',
            originalContent: null,
          },
          status: 'pending',
          createdAt: 0,
        }}
        onApply={() => {}}
        onReject={() => {}}
        onOpenFile={() => {}}
        onReviewDiff={() => {}}
      />
    )

    expect(html).toContain('Open File')
    expect(html).toContain('Review Diff')
    expect(html).toContain('src/generated.ts')
  })
})
