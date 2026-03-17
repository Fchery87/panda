'use client'

import * as React from 'react'
import { Search, Plus, Star, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  getProviderCatalog,
  searchCatalog,
  type ProviderCatalogEntry,
} from '@/lib/llm/provider-catalog'

interface ProviderCatalogModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  configuredProviderIds: string[]
  onSelectProvider: (entry: ProviderCatalogEntry) => void
}

export function ProviderCatalogModal({
  open,
  onOpenChange,
  configuredProviderIds,
  onSelectProvider,
}: ProviderCatalogModalProps) {
  const [catalog, setCatalog] = React.useState<ProviderCatalogEntry[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const entries = await getProviderCatalog()
        if (!cancelled) {
          setCatalog(entries)
          if (entries.length === 0) {
            setError('No providers found. Please check your connection and try again.')
          }
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          setError(`Failed to load provider catalog: ${message}`)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()

    return () => {
      cancelled = true
    }
  }, [open])

  const filtered = React.useMemo(() => {
    const results = searchCatalog(catalog, searchQuery)
    const configured = new Set(configuredProviderIds)
    return results.filter((entry) => !configured.has(entry.id))
  }, [catalog, searchQuery, configuredProviderIds])

  const handleSelect = (entry: ProviderCatalogEntry) => {
    onSelectProvider(entry)
    onOpenChange(false)
    setSearchQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Provider</DialogTitle>
          <DialogDescription>
            Browse {catalog.length} providers from models.dev. Select one to configure with your API
            key.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading providers...</span>
          </div>
        )}

        {error && <div className="py-8 text-center text-sm text-destructive">{error}</div>}

        {!loading && !error && (
          <ScrollArea className="h-[50vh]">
            <div className="grid grid-cols-1 gap-2 pr-4">
              {filtered.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleSelect(entry)}
                  className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                >
                  <img
                    src={entry.logoUrl}
                    alt=""
                    className="h-8 w-8 flex-shrink-0 rounded object-contain"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{entry.name}</span>
                      {entry.hasSpecialImplementation && (
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                          <Star className="mr-0.5 h-2.5 w-2.5" />
                          Enhanced
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.models.length} model{entry.models.length !== 1 ? 's' : ''}
                      {entry.baseUrl ? ` · ${new URL(entry.baseUrl).hostname}` : ''}
                    </p>
                  </div>

                  <Plus className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                </button>
              ))}

              {filtered.length === 0 && !loading && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {searchQuery ? 'No providers match your search' : 'No more providers available'}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
