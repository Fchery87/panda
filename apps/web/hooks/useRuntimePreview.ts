'use client'

import { useCallback, useState } from 'react'

export type RuntimePreviewState = 'idle' | 'building' | 'running' | 'failed'

interface OpenPreviewOptions {
  url?: string | null
  state?: RuntimePreviewState
}

export function useRuntimePreview() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewState, setPreviewState] = useState<RuntimePreviewState>('idle')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const openPreview = useCallback((options?: OpenPreviewOptions) => {
    if (options?.url !== undefined) {
      setPreviewUrl(options.url)
    }
    if (options?.state) {
      setPreviewState(options.state)
    }
    setIsPreviewOpen(true)
  }, [])

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false)
  }, [])

  return {
    previewUrl,
    setPreviewUrl,
    previewState,
    setPreviewState,
    isPreviewOpen,
    setIsPreviewOpen,
    openPreview,
    closePreview,
  }
}
