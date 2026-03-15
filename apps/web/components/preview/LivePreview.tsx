'use client'

import { useState } from 'react'
import { Monitor, Smartphone, RefreshCw, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LivePreviewProps {
  url?: string | null
  className?: string
}

export function LivePreview({ url, className }: LivePreviewProps) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')
  const [refreshKey, setRefreshKey] = useState(0)

  if (!url) {
    return (
      <div className={cn('flex h-full flex-col items-center justify-center', className)}>
        <Monitor className="h-12 w-12 text-muted-foreground/30" />
        <p className="mt-4 font-mono text-sm font-medium text-foreground">No preview available</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Preview will appear when the agent generates a running application
        </p>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Toolbar */}
      <div className="surface-1 flex h-8 shrink-0 items-center justify-between border-b border-border px-2">
        {/* Left: viewport toggle */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-6 w-6 rounded-none p-0',
              viewport === 'desktop' && 'bg-surface-2 text-foreground'
            )}
            onClick={() => setViewport('desktop')}
            aria-label="Desktop viewport"
          >
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-6 w-6 rounded-none p-0',
              viewport === 'mobile' && 'bg-surface-2 text-foreground'
            )}
            onClick={() => setViewport('mobile')}
            aria-label="Mobile viewport"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Right: refresh + open in tab */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 rounded-none p-0"
            onClick={() => setRefreshKey((k) => k + 1)}
            aria-label="Refresh preview"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 rounded-none p-0"
            onClick={() => window.open(url, '_blank')}
            aria-label="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Iframe container */}
      <div className="flex flex-1 items-center justify-center overflow-hidden bg-background p-2">
        <iframe
          key={refreshKey}
          src={url}
          className={cn(
            'h-full border border-border bg-white',
            viewport === 'desktop' ? 'w-full' : 'w-[375px]'
          )}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Live Preview"
        />
      </div>
    </div>
  )
}
