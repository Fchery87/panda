'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { WebContainer } from '@webcontainer/api'

export type WebcontainerStatus = 'idle' | 'booting' | 'ready' | 'error' | 'unsupported'

interface WebcontainerContextValue {
  instance: WebContainer | null
  status: WebcontainerStatus
  error: string | null
}

const WebcontainerContext = createContext<WebcontainerContextValue | null>(null)

function isWebcontainerEnabled(): boolean {
  return process.env.NEXT_PUBLIC_WEBCONTAINER_ENABLED !== 'false'
}

function hasSharedArrayBufferSupport(): boolean {
  return typeof SharedArrayBuffer !== 'undefined' && window.crossOriginIsolated
}

export function WebcontainerProvider({ children }: { children: React.ReactNode }) {
  const [instance, setInstance] = useState<WebContainer | null>(null)
  const [status, setStatus] = useState<WebcontainerStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const bootStartedRef = useRef(false)

  useEffect(() => {
    if (bootStartedRef.current) return
    bootStartedRef.current = true

    if (!isWebcontainerEnabled() || !hasSharedArrayBufferSupport()) {
      setStatus('unsupported')
      return
    }

    let cancelled = false
    setStatus('booting')

    import('@webcontainer/api')
      .then(({ WebContainer }) => WebContainer.boot({ coep: 'credentialless' }))
      .then((webcontainer) => {
        if (cancelled) return
        setInstance(webcontainer)
        setStatus('ready')
      })
      .catch((bootError: unknown) => {
        if (cancelled) return
        setError(bootError instanceof Error ? bootError.message : 'Failed to boot WebContainer')
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(() => ({ instance, status, error }), [error, instance, status])

  return <WebcontainerContext.Provider value={value}>{children}</WebcontainerContext.Provider>
}

export function useWebcontainer(): WebcontainerContextValue {
  const context = useContext(WebcontainerContext)
  if (!context) throw new Error('useWebcontainer must be used within WebcontainerProvider')
  return context
}
