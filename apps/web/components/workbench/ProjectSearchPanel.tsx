'use client'

import { useState } from 'react'
import { Search, Loader2, AlertCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectSearch } from '@/hooks/useProjectSearch'

interface ProjectSearchPanelProps {
  onSelectFile: (path: string, location?: { line: number; column: number }) => void
}

export function ProjectSearchPanel({ onSelectFile }: ProjectSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'literal' | 'regex'>('literal')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [replaceText, setReplaceText] = useState('')
  const [isReplaceMode, setIsReplaceMode] = useState(false)
  const [replaceStatus, setReplaceStatus] = useState<string | null>(null)
  const { state, search, clearSearch } = useProjectSearch()

  const groupedMatches = (() => {
    const byFile = new Map<string, typeof state.matches>()
    for (const match of state.matches) {
      const existing = byFile.get(match.file)
      if (existing) {
        existing.push(match)
      } else {
        byFile.set(match.file, [match])
      }
    }
    return Array.from(byFile.entries())
  })()

  const onQueryChange = (value: string) => {
    setQuery(value)
    void search(value, {
      mode,
      caseSensitive,
      maxResults: 200,
      maxMatchesPerFile: 20,
      contextLines: 0,
      timeoutMs: 8000,
    })
  }

  const clear = () => {
    setQuery('')
    clearSearch()
  }

  const handleReplaceInFile = async (filePath: string | null) => {
    const targetFiles = filePath ? [filePath] : [...new Set(state.matches.map((r) => r.file))]

    let totalReplacements = 0
    for (const file of targetFiles) {
      try {
        const res = await fetch('/api/search/replace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: file,
            searchText: query,
            replaceText,
            isRegex: mode === 'regex',
            caseSensitive,
            replaceAll: true,
          }),
        })
        const data = await res.json()
        totalReplacements += data.replacements ?? 0
      } catch {
        // skip failed files
      }
    }
    setReplaceStatus(`Replaced ${totalReplacements} occurrence(s)`)
    // Re-trigger search to update results
    if (query.trim()) {
      void search(query, { mode, caseSensitive })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-2">
        <div className="mb-2 flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search code..."
            className="h-8 w-full rounded-none border border-border bg-background px-2 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={clear}
              className="h-8 border border-border px-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('literal')
              if (query.trim()) {
                void search(query, { mode: 'literal', caseSensitive })
              }
            }}
            className={cn(
              'h-7 border px-2 font-mono text-xs uppercase tracking-widest transition-colors',
              mode === 'literal'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            Literal
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('regex')
              if (query.trim()) {
                void search(query, { mode: 'regex', caseSensitive })
              }
            }}
            className={cn(
              'h-7 border px-2 font-mono text-xs uppercase tracking-widest transition-colors',
              mode === 'regex'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            Regex
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !caseSensitive
              setCaseSensitive(next)
              if (query.trim()) {
                void search(query, { mode, caseSensitive: next })
              }
            }}
            className={cn(
              'h-7 border px-2 font-mono text-xs uppercase tracking-widest transition-colors',
              caseSensitive
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            Case
          </button>
          <button
            type="button"
            onClick={() => setIsReplaceMode((v) => !v)}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-none border border-transparent transition-colors',
              isReplaceMode
                ? 'bg-surface-2 text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Toggle Replace"
          >
            <ChevronDown
              className={cn('h-3 w-3 transition-transform', isReplaceMode && 'rotate-180')}
            />
          </button>
        </div>

        {isReplaceMode && (
          <div className="flex items-center gap-1 px-3 pb-2">
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace with..."
              className="bg-surface-0 flex-1 border border-border px-2 py-1 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => handleReplaceInFile(null)}
              disabled={!query || state.matches.length === 0}
              className="px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-40"
              title="Replace All in All Files"
            >
              All
            </button>
          </div>
        )}

        {(state.warnings.length > 0 || state.error) && (
          <div className="mt-2 space-y-1">
            {state.error && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span className="font-mono">{state.error}</span>
              </div>
            )}
            {state.warnings.map((warning) => (
              <div key={warning} className="font-mono text-xs text-amber-500">
                {warning}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="scrollbar-thin flex-1 overflow-auto p-2">
        {state.isLoading ? (
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching...
          </div>
        ) : groupedMatches.length === 0 ? (
          <div className="font-mono text-xs text-muted-foreground">
            {state.query ? 'No matches found' : 'Type to search the project'}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {state.stats?.matchesReturned ?? 0} matches in {state.stats?.filesMatched ?? 0} files
              {state.engine ? ` (${state.engine})` : ''}
            </div>

            {groupedMatches.map(([file, matches]) => (
              <div key={file} className="border border-border">
                <div className="bg-surface-2 flex items-center border-b border-border">
                  <button
                    type="button"
                    onClick={() => onSelectFile(file)}
                    className="hover:bg-surface-1 flex-1 px-2 py-1 text-left font-mono text-xs text-foreground"
                  >
                    {file}
                  </button>
                  {isReplaceMode && (
                    <button
                      type="button"
                      onClick={() => handleReplaceInFile(file)}
                      className="ml-auto px-1 font-mono text-[10px] uppercase text-muted-foreground hover:text-foreground"
                      title={`Replace all in ${file}`}
                    >
                      Replace
                    </button>
                  )}
                </div>
                <div>
                  {matches.slice(0, 8).map((match) => (
                    <button
                      key={`${file}:${match.line}:${match.column}:${match.snippet}`}
                      type="button"
                      onClick={() => onSelectFile(file, { line: match.line, column: match.column })}
                      className="hover:bg-surface-1 block w-full border-b border-border/60 px-2 py-1 text-left font-mono text-xs text-muted-foreground hover:text-foreground"
                    >
                      <span className="mr-2 text-primary">{match.line}</span>
                      {match.snippet}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
