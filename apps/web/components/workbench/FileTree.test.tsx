import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { FileTree } from './FileTree'

describe('FileTree folder placeholders', () => {
  test('renders .gitkeep placeholders as folders without showing placeholder files', () => {
    const html = renderToStaticMarkup(
      <FileTree
        files={[
          {
            _id: 'file:docs/.gitkeep',
            path: 'docs/.gitkeep',
            isBinary: false,
            updatedAt: 0,
          },
        ]}
        selectedPath={null}
        onSelect={() => {}}
        onCreate={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />
    )

    expect(html).toContain('docs')
    expect(html).not.toContain('.gitkeep')
    expect(html).not.toContain('No files yet')
  })
})

describe('FileTree generated change badges', () => {
  test('renders pending generated file badges', () => {
    const html = renderToStaticMarkup(
      <FileTree
        files={[
          {
            _id: 'pending:generated.ts',
            path: 'generated.ts',
            isBinary: false,
            updatedAt: 0,
          },
        ]}
        fileStatuses={{
          'generated.ts': {
            source: 'agent',
            changeType: 'added',
            reviewStatus: 'pending',
            artifactId: 'artifact-new-file',
          },
        }}
        selectedPath={null}
        onSelect={() => {}}
        onCreate={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />
    )

    expect(html).toContain('generated.ts')
    expect(html).toContain('New')
  })

  test('does not render a badge when no file status exists', () => {
    const html = renderToStaticMarkup(
      <FileTree
        files={[
          {
            _id: 'file:plain.ts',
            path: 'plain.ts',
            isBinary: false,
            updatedAt: 0,
          },
        ]}
        selectedPath={null}
        onSelect={() => {}}
        onCreate={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
      />
    )

    expect(html).toContain('plain.ts')
    expect(html).not.toContain('New')
    expect(html).not.toContain('Modified')
  })
})
