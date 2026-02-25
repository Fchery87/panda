import type { ToolContext } from '../tools'

const ORACLE_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'can',
  'find',
  'for',
  'how',
  'i',
  'in',
  'is',
  'show',
  'the',
  'to',
  'what',
  'where',
])

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function selectSignificantToken(query: string): string {
  const tokens = query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)

  const preferred = tokens.find((token) => {
    const normalized = token.replace(/^[^\p{L}\p{N}_$]+|[^\p{L}\p{N}_$]+$/gu, '').toLowerCase()
    return normalized.length >= 3 && !ORACLE_STOPWORDS.has(normalized)
  })
  if (preferred) return preferred

  return tokens.find((token) => token.length > 0) ?? ''
}

export async function executeOracleSearch(query: string, context: ToolContext) {
  if (!context.searchCode) {
    throw new Error('search_code is not available in this context')
  }

  const startTime = Date.now()

  // Clean the query slightly
  const cleanQuery = query.trim().replace(/^['"]|['"]$/g, '')

  if (!cleanQuery) {
    return {
      engine: 'oracle_multi_tier',
      query: '',
      matches: [],
      stats: {
        totalFound: 0,
        durationMs: Date.now() - startTime,
        literalMatches: 0,
        regexMatches: 0,
      },
    }
  }

  try {
    // 1. Literal search for the exact query
    const literalResult = await context.searchCode({
      query: cleanQuery,
      mode: 'literal',
      caseSensitive: false,
      maxResults: 15,
    })

    // 2. Regex search for symbol definitions (class, interface, function, const)
    // We break the query into words and look for the most significant one
    const significantToken = selectSignificantToken(cleanQuery)
    const escapedToken = escapeRegexLiteral(significantToken)
    const regexResult = escapedToken
      ? await context.searchCode({
          query: `(class|interface|function|const|let|var|type)\\s+[^\\s=]*${escapedToken}[^\\s=]*`,
          mode: 'regex',
          caseSensitive: false,
          maxResults: 15,
        })
      : { matches: [] }

    // Combine results
    const combined = [...(literalResult?.matches || []), ...(regexResult?.matches || [])]

    // Deduplicate by file and line
    const uniqueMatches = Array.from(
      new Map(combined.map((m) => [`${m.file}:${m.line}`, m])).values()
    )

    return {
      engine: 'oracle_multi_tier',
      query: cleanQuery,
      matches: uniqueMatches.slice(0, 20),
      stats: {
        totalFound: uniqueMatches.length,
        durationMs: Date.now() - startTime,
        literalMatches: literalResult?.matches?.length || 0,
        regexMatches: regexResult?.matches?.length || 0,
      },
    }
  } catch (error) {
    throw new Error(
      `Oracle search failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
