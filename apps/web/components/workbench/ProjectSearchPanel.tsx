'use client'

import { useState } from 'react'
import { Search, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectSearch } from '@/hooks/useProjectSearch'

interface ProjectSearchPanelProps {
  onSelectFile: (path: string, location?: { line: number; column: number }) => void
}

export function ProjectSearchPanel({ onSelectFile }: ProjectSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'literal' | 'regex'>('literal')
  const [caseSensitive, setCaseSensitive] = useState(false)
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
              className="h-8 border border-border px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
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
              'h-7 border px-2 font-mono text-[10px] uppercase tracking-widest transition-colors',
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
              'h-7 border px-2 font-mono text-[10px] uppercase tracking-widest transition-colors',
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
              'h-7 border px-2 font-mono text-[10px] uppercase tracking-widest transition-colors',
              caseSensitive
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            Case
          </button>
        </div>

        {(state.warnings.length > 0 || state.error) && (
          <div className="mt-2 space-y-1">
            {state.error && (
              <div className="flex items-center gap-1 text-[10px] text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span className="font-mono">{state.error}</span>
              </div>
            )}
            {state.warnings.map((warning) => (
              <div key={warning} className="font-mono text-[10px] text-amber-500">
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
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {state.stats?.matchesReturned ?? 0} matches in {state.stats?.filesMatched ?? 0} files
              {state.engine ? ` (${state.engine})` : ''}
            </div>

            {groupedMatches.map(([file, matches]) => (
              <div key={file} className="border border-border">
                <button
                  type="button"
                  onClick={() => onSelectFile(file)}
                  className="bg-surface-2 hover:bg-surface-1 w-full border-b border-border px-2 py-1 text-left font-mono text-[11px] text-foreground"
                >
                  {file}
                </button>
                <div>
                  {matches.slice(0, 8).map((match) => (
                    <button
                      key={`${file}:${match.line}:${match.column}:${match.snippet}`}
                      type="button"
                      onClick={() => onSelectFile(file, { line: match.line, column: match.column })}
                      className="hover:bg-surface-1 block w-full border-b border-border/60 px-2 py-1 text-left font-mono text-[10px] text-muted-foreground hover:text-foreground"
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
