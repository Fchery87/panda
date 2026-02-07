import type {
  NormalizedTextSearchRequest,
  SearchMatch,
  SearchResponse,
  SearchRunOptions,
  TextSearchEngine,
} from '../types'
import { runSearchCommand } from '../runner'

interface RipgrepJsonEnvelope {
  type: string
  data?: Record<string, unknown>
}

function decodeField(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const text = (value as { text?: unknown }).text
  if (typeof text === 'string') return text
  const bytes = (value as { bytes?: unknown }).bytes
  if (typeof bytes === 'string') {
    try {
      return Buffer.from(bytes, 'base64').toString('utf8')
    } catch {
      return ''
    }
  }
  return ''
}

function toMatchFromEvent(event: RipgrepJsonEnvelope): SearchMatch | null {
  if (event.type !== 'match' || !event.data) return null
  const pathValue = decodeField(event.data.path)
  if (!pathValue) return null

  const lineNumber = Number(event.data.line_number)
  const safeLine = Number.isFinite(lineNumber) ? lineNumber : 1

  const lineText = decodeField(event.data.lines).replace(/\r?\n$/, '')
  const submatches: Array<{ start: number; end: number; text?: string }> = []
  if (Array.isArray(event.data.submatches)) {
    for (const sm of event.data.submatches) {
      if (!sm || typeof sm !== 'object') continue
      const start = Number((sm as { start?: unknown }).start)
      const end = Number((sm as { end?: unknown }).end)
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue
      const text = decodeField((sm as { match?: unknown }).match)
      submatches.push({ start, end, text: text || undefined })
    }
  }

  return {
    file: pathValue,
    line: safeLine,
    column: submatches[0] ? submatches[0].start + 1 : 1,
    snippet: lineText,
    submatches,
  }
}

function parseRipgrepJsonLines(
  stdout: string,
  maxResults: number
): {
  matches: SearchMatch[]
  filesMatched: number
  filesScanned?: number
} {
  const matches: SearchMatch[] = []
  const files = new Set<string>()
  let filesScanned: number | undefined

  const lines = stdout.split('\n')
  for (const line of lines) {
    if (!line.trim()) continue
    let parsed: RipgrepJsonEnvelope
    try {
      parsed = JSON.parse(line) as RipgrepJsonEnvelope
    } catch {
      continue
    }

    if (parsed.type === 'summary' && parsed.data && typeof parsed.data === 'object') {
      const stats = (parsed.data as { stats?: unknown }).stats
      if (stats && typeof stats === 'object') {
        const searches = Number((stats as { searches?: unknown }).searches)
        if (Number.isFinite(searches)) filesScanned = searches
      }
      continue
    }

    const match = toMatchFromEvent(parsed)
    if (!match) continue

    files.add(match.file)
    matches.push(match)
    if (matches.length >= maxResults) {
      break
    }
  }

  return {
    matches,
    filesMatched: files.size,
    filesScanned,
  }
}

export function buildRipgrepArgs(request: NormalizedTextSearchRequest): string[] {
  const args = ['--json', '--line-number', '--column', '--no-messages']

  if (request.mode === 'literal') {
    args.push('-F')
  }
  if (!request.caseSensitive) {
    args.push('-i')
  }

  args.push('--max-count', String(request.maxMatchesPerFile))

  if (request.contextLines > 0) {
    args.push('-C', String(request.contextLines))
  }

  for (const glob of request.includeGlobs) {
    args.push('--glob', glob)
  }
  for (const glob of request.excludeGlobs) {
    const value = glob.startsWith('!') ? glob : `!${glob}`
    args.push('--glob', value)
  }

  args.push(request.query)
  args.push(...request.paths)

  return args
}

export async function executeRipgrep(
  request: NormalizedTextSearchRequest,
  options: SearchRunOptions
): Promise<SearchResponse> {
  const result = await runSearchCommand('rg', buildRipgrepArgs(request), options)
  const parsed = parseRipgrepJsonLines(result.stdout, request.maxResults)

  const warnings: string[] = []
  if (result.timedOut) warnings.push('Search timed out')
  if (result.truncated) warnings.push('Search output was truncated')
  if (result.exitCode !== 0 && result.exitCode !== 1 && result.stderr.trim()) {
    warnings.push(result.stderr.trim())
  }

  const truncated = result.truncated || parsed.matches.length >= request.maxResults

  return {
    engine: 'ripgrep',
    query: request.query,
    mode: request.mode,
    truncated,
    stats: {
      durationMs: result.durationMs,
      filesScanned: parsed.filesScanned,
      filesMatched: parsed.filesMatched,
      matchesReturned: parsed.matches.length,
    },
    warnings,
    matches: parsed.matches,
  }
}

export const RIPGREP_ENGINE: TextSearchEngine = 'ripgrep'
