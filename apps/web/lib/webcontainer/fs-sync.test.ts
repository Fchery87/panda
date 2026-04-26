import { describe, expect, test } from 'bun:test'

import { buildFileSystemTree } from './fs-sync'

describe('buildFileSystemTree', () => {
  test('converts flat project files into a nested WebContainer tree', () => {
    expect(
      buildFileSystemTree([
        { path: 'package.json', content: '{"scripts":{}}' },
        { path: 'src/index.ts', content: 'export {}' },
      ])
    ).toEqual({
      'package.json': { file: { contents: '{"scripts":{}}' } },
      src: {
        directory: {
          'index.ts': { file: { contents: 'export {}' } },
        },
      },
    })
  })
})
