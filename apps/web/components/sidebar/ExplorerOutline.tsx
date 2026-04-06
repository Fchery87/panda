'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { IconBracketsCurly, IconBracketsAngle, IconText, IconHash } from '@/components/ui/icons'

export interface OutlineSymbol {
  name: string
  kind: 'function' | 'class' | 'const' | 'export' | 'heading'
  line: number
  level?: number // For headings (1-6)
}

interface ExplorerOutlineProps {
  fileContent: string | null | undefined
  filePath: string | null
  onSelectSymbol: (line: number) => void
  className?: string
}

// Parse symbols from file content using regex
function parseSymbols(content: string, filePath: string): OutlineSymbol[] {
  const symbols: OutlineSymbol[] = []
  const lines = content.split('\n')
  const isMarkdown = filePath.endsWith('.md') || filePath.endsWith('.markdown')
  const isTypeScript =
    filePath.endsWith('.ts') ||
    filePath.endsWith('.tsx') ||
    filePath.endsWith('.js') ||
    filePath.endsWith('.jsx')

  lines.forEach((line, index) => {
    const lineNumber = index + 1

    if (isMarkdown) {
      // Parse markdown headings: # ## ### etc.
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const name = headingMatch[2].trim()
        symbols.push({ name, kind: 'heading', line: lineNumber, level })
      }
    } else if (isTypeScript) {
      // Parse TypeScript/JavaScript symbols
      // Export function
      const exportFunctionMatch = line.match(/export\s+(?:async\s+)?function\s+(\w+)/)
      if (exportFunctionMatch) {
        symbols.push({ name: exportFunctionMatch[1], kind: 'export', line: lineNumber })
        return
      }

      // Export class
      const exportClassMatch = line.match(/export\s+class\s+(\w+)/)
      if (exportClassMatch) {
        symbols.push({ name: exportClassMatch[1], kind: 'class', line: lineNumber })
        return
      }

      // Export const
      const exportConstMatch = line.match(/export\s+const\s+(\w+)/)
      if (exportConstMatch) {
        symbols.push({ name: exportConstMatch[1], kind: 'const', line: lineNumber })
        return
      }

      // Regular function
      const functionMatch = line.match(/(?:async\s+)?function\s+(\w+)/)
      if (functionMatch) {
        symbols.push({ name: functionMatch[1], kind: 'function', line: lineNumber })
        return
      }

      // Arrow function export: export const name = ...
      const arrowExportMatch = line.match(/export\s+const\s+(\w+)\s*=/)
      if (arrowExportMatch && line.includes('=>')) {
        symbols.push({ name: arrowExportMatch[1], kind: 'export', line: lineNumber })
        return
      }

      // Class
      const classMatch = line.match(/class\s+(\w+)/)
      if (classMatch) {
        symbols.push({ name: classMatch[1], kind: 'class', line: lineNumber })
        return
      }

      // Interface (TypeScript)
      const interfaceMatch = line.match(/(?:export\s+)?interface\s+(\w+)/)
      if (interfaceMatch) {
        symbols.push({ name: interfaceMatch[1], kind: 'class', line: lineNumber })
        return
      }

      // Type alias (TypeScript)
      const typeMatch = line.match(/(?:export\s+)?type\s+(\w+)/)
      if (typeMatch && line.includes('=')) {
        symbols.push({ name: typeMatch[1], kind: 'const', line: lineNumber })
        return
      }
    }
  })

  return symbols
}

function getSymbolIcon(kind: OutlineSymbol['kind']) {
  switch (kind) {
    case 'function':
    case 'export':
      return <IconBracketsCurly className="h-3 w-3" weight="duotone" />
    case 'class':
      return <IconBracketsAngle className="h-3 w-3" weight="duotone" />
    case 'const':
      return <IconHash className="h-3 w-3" weight="duotone" />
    case 'heading':
      return <IconText className="h-3 w-3" weight="duotone" />
    default:
      return <IconBracketsCurly className="h-3 w-3" weight="duotone" />
  }
}

function getSymbolColor(kind: OutlineSymbol['kind']) {
  switch (kind) {
    case 'function':
      return 'text-blue-500'
    case 'export':
      return 'text-green-500'
    case 'class':
      return 'text-purple-500'
    case 'const':
      return 'text-yellow-500'
    case 'heading':
      return 'text-muted-foreground'
    default:
      return 'text-muted-foreground'
  }
}

export function ExplorerOutline({
  fileContent,
  filePath,
  onSelectSymbol,
  className,
}: ExplorerOutlineProps) {
  const symbols = useMemo(() => {
    if (!fileContent || !filePath) return []
    return parseSymbols(fileContent, filePath)
  }, [fileContent, filePath])

  if (!symbols.length) {
    return (
      <div className={cn('px-3 py-2 text-center', className)}>
        <p className="font-mono text-[10px] text-muted-foreground">No symbols found</p>
      </div>
    )
  }

  const fileName = filePath?.split('/').pop() || 'Unknown file'

  return (
    <div className={cn('border-t border-border', className)}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] font-medium uppercase tracking-wide">Outline</span>
        <span className="font-mono text-[10px] text-muted-foreground">{fileName}</span>
      </div>

      <div className="max-h-[200px] overflow-y-auto py-1">
        {symbols.map((symbol, index) => (
          <motion.button
            key={`${symbol.name}-${symbol.line}-${index}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 }}
            type="button"
            onClick={() => onSelectSymbol(symbol.line)}
            className="hover:bg-surface-2 flex w-full items-center gap-2 px-3 py-1 text-left transition-colors"
            style={{
              paddingLeft: symbol.kind === 'heading' ? `${12 + (symbol.level || 1) * 8}px` : '12px',
            }}
          >
            <span className={cn('shrink-0', getSymbolColor(symbol.kind))}>
              {getSymbolIcon(symbol.kind)}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground hover:text-foreground">
              {symbol.name}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50">
              {symbol.line}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
