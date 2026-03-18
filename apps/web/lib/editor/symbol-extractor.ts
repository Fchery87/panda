// apps/web/lib/editor/symbol-extractor.ts

export interface SymbolInfo {
  name: string
  kind: 'function' | 'class' | 'interface' | 'type' | 'enum' | 'method' | 'variable'
  startLine: number
  endLine: number
}

/**
 * Extracts the innermost symbol (function, class, interface) containing
 * the given line number (1-indexed).
 *
 * Uses regex-based heuristics — not a full AST parser, but good enough
 * for breadcrumb display in TS/JS/TSX/JSX files.
 */
export function extractSymbolAtLine(
  code: string,
  line: number,
  _language: string
): SymbolInfo | null {
  const lines = code.split('\n')
  const symbols = extractSymbols(lines)

  // Find all symbols that contain this line, return innermost (most specific)
  const containing = symbols
    .filter((s) => line >= s.startLine && line <= s.endLine)
    .sort((a, b) => b.startLine - a.startLine || a.endLine - b.endLine)

  return containing[0] ?? null
}

/**
 * Extracts all top-level and nested symbol definitions from source code.
 */
function extractSymbols(lines: string[]): SymbolInfo[] {
  const symbols: SymbolInfo[] = []
  const braceStack: Array<{
    name: string
    kind: SymbolInfo['kind']
    startLine: number
    depth: number
  }> = []
  let braceDepth = 0

  const patterns: Array<{ regex: RegExp; kind: SymbolInfo['kind'] }> = [
    { regex: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/, kind: 'function' },
    { regex: /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/, kind: 'function' },
    {
      regex:
        /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>/,
      kind: 'function',
    },
    { regex: /(?:export\s+)?class\s+(\w+)/, kind: 'class' },
    { regex: /(?:export\s+)?interface\s+(\w+)/, kind: 'interface' },
    { regex: /(?:export\s+)?type\s+(\w+)\s*=/, kind: 'type' },
    { regex: /(?:export\s+)?enum\s+(\w+)/, kind: 'enum' },
    { regex: /^\s+(?:async\s+)?(\w+)\s*\(/, kind: 'method' },
  ]

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i]
    const lineNum = i + 1

    // Check for symbol definitions
    for (const { regex, kind } of patterns) {
      const match = lineText.match(regex)
      if (match && match[1]) {
        // If line also opens a brace, we'll track it
        if (lineText.includes('{')) {
          braceStack.push({ name: match[1], kind, startLine: lineNum, depth: braceDepth })
        }
      }
    }

    // Track brace depth
    for (const ch of lineText) {
      if (ch === '{') braceDepth++
      if (ch === '}') {
        braceDepth--
        // Check if this closes a tracked symbol
        const top = braceStack[braceStack.length - 1]
        if (top && braceDepth === top.depth) {
          braceStack.pop()
          symbols.push({
            name: top.name,
            kind: top.kind,
            startLine: top.startLine,
            endLine: lineNum,
          })
        }
      }
    }
  }

  return symbols
}

/**
 * Extract all symbols from code (for outline view).
 */
export function extractAllSymbols(code: string, _language: string): SymbolInfo[] {
  return extractSymbols(code.split('\n'))
}
