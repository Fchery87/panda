'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ExternalLink, RefreshCw, Maximize2, Monitor, Smartphone, Tablet, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface PreviewProps {
  url?: string
}

type DeviceType = 'desktop' | 'tablet' | 'mobile'

export function Preview({ url }: PreviewProps) {
  const [device, setDevice] = React.useState<DeviceType>('desktop')
  const [isLoading, setIsLoading] = React.useState(false)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  const handleRefresh = () => {
    if (iframeRef.current && url) {
      setIsLoading(true)
      iframeRef.current.src = url
      setTimeout(() => setIsLoading(false), 500)
    }
  }

  const deviceSizes = {
    desktop: { width: '100%', maxWidth: 'none' },
    tablet: { width: '768px', maxWidth: '100%' },
    mobile: { width: '375px', maxWidth: '100%' },
  }

  const DeviceButton: React.FC<{
    type: DeviceType
    icon: React.ReactNode
    label: string
  }> = ({ type, icon, label }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8',
            device === type
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setDevice(type)}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col border-l border-border bg-background">
        {/* Preview Header */}
        <div className="surface-2 flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-3">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Preview</span>
            {url && (
              <span className="max-w-[150px] truncate text-xs text-muted-foreground">
                {new URL(url).hostname}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Device toggle buttons */}
            <div className="flex items-center gap-0.5 rounded-md bg-muted/50 p-0.5">
              <DeviceButton type="desktop" icon={<Monitor className="h-4 w-4" />} label="Desktop" />
              <DeviceButton type="tablet" icon={<Tablet className="h-4 w-4" />} label="Tablet" />
              <DeviceButton
                type="mobile"
                icon={<Smartphone className="h-4 w-4" />}
                label="Mobile"
              />
            </div>

            <div className="mx-2 h-4 w-px bg-border" />

            {/* Action buttons */}
            {url && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={handleRefresh}
                      aria-label="Refresh preview"
                    >
                      <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => url && window.open(url, '_blank', 'noopener,noreferrer')}
                      aria-label="Open preview in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open in new tab</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      aria-label="Toggle fullscreen"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Full screen</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-background">
          <div className="flex h-full items-center justify-center p-4">
            <motion.div
              key={device}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'h-full transition-all duration-300 ease-out',
                device !== 'desktop' && 'shadow-2xl shadow-black/50'
              )}
              style={{
                width: deviceSizes[device].width,
                maxWidth: deviceSizes[device].maxWidth,
              }}
            >
              {url ? (
                <iframe
                  ref={iframeRef}
                  src={url}
                  className="h-full w-full border-0 bg-white"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  title="Preview"
                  onLoad={() => setIsLoading(false)}
                />
              ) : (
                <PlaceholderState />
              )}
            </motion.div>
          </div>
        </div>

        {/* Status bar */}
        <div className="surface-2 flex items-center justify-between border-t border-border px-4 py-1.5">
          <div className="flex items-center gap-2">
            {url ? (
              <>
                <span className="h-2 w-2 rounded-full bg-status-online" />
                <span className="text-xs text-muted-foreground">Connected</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                <span className="text-xs text-muted-foreground">No preview URL</span>
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {device.charAt(0).toUpperCase() + device.slice(1)} view
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

// Placeholder state when no URL is provided
function PlaceholderState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50"
    >
      <div className="relative">
        {/* Animated rings */}
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Eye className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>

      <h3 className="mt-6 text-lg font-semibold text-muted-foreground">No Preview Available</h3>
      <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">
        Deploy your project to see a live preview here, or connect an external URL.
      </p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 flex items-center gap-2 text-xs text-muted-foreground/70"
      >
        <span className="rounded bg-muted px-2 py-1">Deploy</span>
        <span>→</span>
        <span className="rounded bg-muted px-2 py-1">Preview</span>
      </motion.div>
    </motion.div>
  )
}
