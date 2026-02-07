import path from 'node:path'
import type {
  AstSearchRequest,
  NormalizedAstSearchRequest,
  NormalizedTextSearchRequest,
  SearchRequest,
  TextSearchRequest,
} from './types'

const DEFAULT_MAX_RESULTS = 200
const HARD_MAX_RESULTS = 1000

const DEFAULT_MAX_MATCHES_PER_FILE = 50
const HARD_MAX_MATCHES_PER_FILE = 200

const DEFAULT_CONTEXT_LINES = 0
const HARD_MAX_CONTEXT_LINES = 3

const DEFAULT_TIMEOUT_MS = 8000
const HARD_MAX_TIMEOUT_MS = 15000

const DEFAULT_AST_TIMEOUT_MS = 10000
const DEFAULT_AST_JSON_STYLE = 'stream'

const DENYLIST_PREFIXES = [
  '.git/',
  '.next/',
  'node_modules/',
  'dist/',
  'coverage/',
  '.turbo/',
  '.cache/',
]

const DENYLIST_EXACT = new Set(['.env', '.env.local', '.env.production', '.env.development'])

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(min, Math.min(max, Math.floor(num)))
}

function normalizePathInput(value: unknown): string[] {
  if (!Array.isArray(value)) return ['.']
  const paths = value
    .filter((p): p is string => typeof p === 'string')
    .map((p) => p.trim())
    .filter(Boolean)
  return paths.length > 0 ? paths : ['.']
}

function normalizeGlobList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((g): g is string => typeof g === 'string')
    .map((g) => g.trim())
    .filter(Boolean)
}

export function toWorkspaceRelativePath(inputPath: string): string {
  const normalized = inputPath.replace(/\\/g, '/').replace(/^\.\//, '')
  const cleaned = normalized === '' ? '.' : normalized
  const resolved = path.posix.normalize(cleaned)

  if (resolved.startsWith('../') || resolved === '..') {
    throw new Error(`Path escapes workspace: ${inputPath}`)
  }

  return resolved
}

export function isDeniedPath(relativePath: string): boolean {
  const normalized = toWorkspaceRelativePath(relativePath)
  if (normalized === '.') return false

  if (DENYLIST_EXACT.has(normalized)) return true

  for (const prefix of DENYLIST_PREFIXES) {
    if (normalized === prefix.slice(0, -1) || normalized.startsWith(prefix)) {
      return true
    }
  }

  if (
    normalized.endsWith('.pem') ||
    normalized.endsWith('.key') ||
    normalized.startsWith('.env.')
  ) {
    return true
  }

  return false
}

function normalizePaths(value: unknown): string[] {
  const paths = normalizePathInput(value).map(toWorkspaceRelativePath)
  for (const p of paths) {
    if (isDeniedPath(p)) {
      throw new Error(`Path is not searchable: ${p}`)
    }
  }
  return paths
}

export function validateTextSearchRequest(input: TextSearchRequest): NormalizedTextSearchRequest {
  const query = (input.query ?? '').trim()
  if (!query) {
    throw new Error('query is required')
  }

  const mode = input.mode === 'regex' ? 'regex' : 'literal'
  const caseSensitive = input.caseSensitive === true

  const includeGlobs = normalizeGlobList(input.includeGlobs)
  const excludeGlobs = normalizeGlobList(input.excludeGlobs)

  return {
    type: 'text',
    query,
    mode,
    caseSensitive,
    includeGlobs,
    excludeGlobs,
    paths: normalizePaths(input.paths),
    maxResults: clampInt(input.maxResults, DEFAULT_MAX_RESULTS, 1, HARD_MAX_RESULTS),
    maxMatchesPerFile: clampInt(
      input.maxMatchesPerFile,
      DEFAULT_MAX_MATCHES_PER_FILE,
      1,
      HARD_MAX_MATCHES_PER_FILE
    ),
    contextLines: clampInt(input.contextLines, DEFAULT_CONTEXT_LINES, 0, HARD_MAX_CONTEXT_LINES),
    timeoutMs: clampInt(input.timeoutMs, DEFAULT_TIMEOUT_MS, 500, HARD_MAX_TIMEOUT_MS),
  }
}

export function validateAstSearchRequest(input: AstSearchRequest): NormalizedAstSearchRequest {
  const pattern = (input.pattern ?? '').trim()
  if (!pattern) {
    throw new Error('pattern is required')
  }

  const jsonStyle =
    input.jsonStyle === 'compact'
      ? 'compact'
      : input.jsonStyle === 'pretty'
        ? 'pretty'
        : DEFAULT_AST_JSON_STYLE

  return {
    type: 'ast',
    pattern,
    language: input.language?.trim() || undefined,
    paths: normalizePaths(input.paths),
    maxResults: clampInt(input.maxResults, DEFAULT_MAX_RESULTS, 1, HARD_MAX_RESULTS),
    timeoutMs: clampInt(input.timeoutMs, DEFAULT_AST_TIMEOUT_MS, 500, HARD_MAX_TIMEOUT_MS),
    jsonStyle,
  }
}

export function validateSearchRequest(
  input: SearchRequest
): NormalizedTextSearchRequest | NormalizedAstSearchRequest {
  if (input.type === 'ast') {
    return validateAstSearchRequest(input)
  }
  return validateTextSearchRequest(input)
}
