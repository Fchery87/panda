export function normalizeProjectFilePath(path: string): string {
  const parts = path
    .trim()
    .replace(/\\/gu, '/')
    .replace(/^\/+|\/+$/gu, '')
    .split('/')
    .filter((part) => part.length > 0 && part !== '.' && part !== '..')

  return parts.join('/')
}
