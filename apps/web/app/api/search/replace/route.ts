// apps/web/app/api/search/replace/route.ts
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { isAuthenticatedNextjs } from '@/lib/auth/nextjs'

const MAX_REGEX_PATTERN_LENGTH = 256
const MAX_FILE_SIZE_BYTES = 1024 * 1024

function isPotentiallyUnsafeRegex(pattern: string): boolean {
  if (pattern.length > MAX_REGEX_PATTERN_LENGTH) return true

  const redFlags = [
    /\\[1-9]/u,
    /\(\?<?[!=]/u,
    /\((?:[^()\\]|\\.)*[+*](?:[^()\\]|\\.)*\)[+*{]/u,
    /\((?:[^()\\]|\\.)*\|(?:[^()\\]|\\.)*\)[+*{]/u,
  ]

  return redFlags.some((flag) => flag.test(pattern))
}

interface ReplaceRequest {
  filePath: string
  searchText: string
  replaceText: string
  isRegex?: boolean
  caseSensitive?: boolean
  replaceAll?: boolean
}

interface ReplaceResult {
  filePath: string
  replacements: number
}

export async function POST(req: Request) {
  if (!(await isAuthenticatedNextjs())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as ReplaceRequest

  if (!body.filePath || body.searchText === undefined || body.replaceText === undefined) {
    return Response.json(
      { error: 'filePath, searchText, and replaceText are required' },
      { status: 400 }
    )
  }

  // Prevent path traversal
  const cwd = process.cwd()
  const absPath = resolve(cwd, body.filePath)
  if (!absPath.startsWith(cwd)) {
    return Response.json({ error: 'Path traversal not allowed' }, { status: 400 })
  }

  try {
    const content = await readFile(absPath, 'utf-8')

    if (Buffer.byteLength(content, 'utf8') > MAX_FILE_SIZE_BYTES) {
      return Response.json({ error: 'File too large for replace' }, { status: 413 })
    }

    let flags = body.caseSensitive ? 'g' : 'gi'
    if (!body.replaceAll) flags = flags.replace('g', '')

    if (body.isRegex && isPotentiallyUnsafeRegex(body.searchText)) {
      return Response.json({ error: 'Unsafe regex pattern rejected' }, { status: 400 })
    }

    const pattern = body.isRegex
      ? new RegExp(body.searchText, flags)
      : new RegExp(body.searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$\u0026'), flags)

    let replacements = 0
    const newContent = content.replace(pattern, (_match) => {
      replacements++
      return body.replaceText
    })

    if (replacements > 0) {
      await writeFile(absPath, newContent, 'utf-8')
    }

    const result: ReplaceResult = { filePath: body.filePath, replacements }
    return Response.json(result)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Replace failed' },
      { status: 500 }
    )
  }
}
