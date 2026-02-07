import type {
  NormalizedAstSearchRequest,
  SearchMatch,
  SearchResponse,
  SearchRunOptions,
} from '../types'
import { runSearchCommand } from '../runner'

interface AstGrepMatch {
  file?: string
  text?: string
  range?: {
    start?: { line?: number; column?: number }
    end?: { line?: number; column?: number }
  }
}

export function buildAstGrepArgs(request: NormalizedAstSearchRequest): string[] {
  const args = ['run', '--pattern', request.pattern, `--json=${request.jsonStyle}`]

  if (request.language) {
    args.push('--lang', request.language)
  }

  args.push(...request.paths)

  return args
}

function toSearchMatch(item: AstGrepMatch): SearchMatch | null {
  if (!item.file || !item.range?.start) return null

  const startLine = Number(item.range.start.line)
  const startColumn = Number(item.range.start.column)
  const endLine = Number(item.range.end?.line)
  const endColumn = Number(item.range.end?.column)

  if (!Number.isFinite(startLine) || !Number.isFinite(startColumn)) return null

  return {
    file: item.file,
    line: startLine + 1,
    column: startColumn + 1,
    endLine: Number.isFinite(endLine) ? endLine + 1 : undefined,
    endColumn: Number.isFinite(endColumn) ? endColumn + 1 : undefined,
    snippet: item.text ?? '',
  }
}

function parseAstGrepOutput(
  stdout: string,
  maxResults: number
): { matches: SearchMatch[]; files: Set<string> } {
  const matches: SearchMatch[] = []
  const files = new Set<string>()

  const trimmed = stdout.trim()
  if (!trimmed) return { matches, files }

  const looksLikeArray = trimmed.startsWith('[')
  if (looksLikeArray) {
    try {
      const parsed = JSON.parse(trimmed) as AstGrepMatch[]
      for (const item of parsed) {
        const match = toSearchMatch(item)
        if (!match) continue
        files.add(match.file)
        matches.push(match)
        if (matches.length >= maxResults) break
      }
      return { matches, files }
    } catch {
      return { matches, files }
    }
  }

  for (const line of trimmed.split('\n')) {
    if (!line.trim()) continue
    try {
      const item = JSON.parse(line) as AstGrepMatch
      const match = toSearchMatch(item)
      if (!match) continue
      files.add(match.file)
      matches.push(match)
      if (matches.length >= maxResults) break
    } catch {
      // ignore parse errors line-by-line
    }
  }

  return { matches, files }
}

export async function executeAstGrep(
  request: NormalizedAstSearchRequest,
  options: SearchRunOptions
): Promise<SearchResponse> {
  const result = await runSearchCommand('ast-grep', buildAstGrepArgs(request), options)
  const parsed = parseAstGrepOutput(result.stdout, request.maxResults)

  const warnings: string[] = []
  if (result.timedOut) warnings.push('AST search timed out')
  if (result.truncated) warnings.push('AST search output was truncated')
  if (result.exitCode !== 0 && result.exitCode !== 1 && result.stderr.trim()) {
    warnings.push(result.stderr.trim())
  }

  return {
    engine: 'ast-grep',
    query: request.pattern,
    mode: 'ast',
    truncated: result.truncated || parsed.matches.length >= request.maxResults,
    stats: {
      durationMs: result.durationMs,
      filesMatched: parsed.files.size,
      matchesReturned: parsed.matches.length,
    },
    warnings,
    matches: parsed.matches,
  }
}
