import type { FileSystemTree, WebContainer } from '@webcontainer/api'

interface ProjectFileRecord {
  path: string
  content?: string | null
  isBinary?: boolean
}

type DirectoryNode = { directory: FileSystemTree }

function isDirectoryNode(entry: FileSystemTree[string] | undefined): entry is DirectoryNode {
  return Boolean(entry && 'directory' in entry)
}

export function buildFileSystemTree(files: ProjectFileRecord[]): FileSystemTree {
  const tree: FileSystemTree = {}

  for (const file of files) {
    if (file.isBinary || file.content == null) continue

    const parts = file.path.split('/').filter(Boolean)
    const fileName = parts.pop()
    if (!fileName) continue

    let current = tree
    for (const part of parts) {
      const existing = current[part]
      if (!isDirectoryNode(existing)) {
        current[part] = { directory: {} }
      }
      current = (current[part] as DirectoryNode).directory
    }

    current[fileName] = { file: { contents: file.content } }
  }

  return tree
}

export async function mountProjectFiles(
  instance: WebContainer,
  files: ProjectFileRecord[]
): Promise<void> {
  await instance.mount(buildFileSystemTree(files))
}

export async function writeFileToContainer(
  instance: WebContainer,
  path: string,
  content: string
): Promise<void> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  await instance.fs.writeFile(normalizedPath, content)
}
