'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { WebContainer } from '@webcontainer/api'
import { bootWebcontainerWithTimeout } from './boot'

export type WebcontainerStatus = 'idle' | 'booting' | 'ready' | 'error' | 'unsupported'

interface WebcontainerContextValue {
  instance: WebContainer | null
  status: WebcontainerStatus
  error: string | null
}

const WebcontainerContext = createContext<WebcontainerContextValue | null>(null)
const WEBCONTAINER_BOOT_TIMEOUT_MS = 30_000

function isWebcontainerEnabled(): boolean {
  return process.env.NEXT_PUBLIC_WEBCONTAINER_ENABLED !== 'false'
}

function hasSharedArrayBufferSupport(): boolean {
  return typeof SharedArrayBuffer !== 'undefined' && window.crossOriginIsolated
}

let bootPromise: Promise<WebContainer> | null = null

/**
 * Get or initialize the singleton WebContainer instance.
 * Since only one instance can be booted concurrently, we keep it in a module-level promise.
 */
function getWebcontainerInstance(): Promise<WebContainer> {
  if (!bootPromise) {
    bootPromise = bootWebcontainerWithTimeout({
      boot: async () => {
        console.log('[WebContainer] Importing @webcontainer/api...')
        const { WebContainer } = await import('@webcontainer/api')
        console.log('[WebContainer] Calling WebContainer.boot({ coep: "credentialless" })...')
        return WebContainer.boot({ coep: 'credentialless' })
      },
      timeoutMs: WEBCONTAINER_BOOT_TIMEOUT_MS,
    }).catch((err) => {
      bootPromise = null // Allow retry on failure
      throw err
    })
  }
  return bootPromise
}

export function WebcontainerProvider({ children }: { children: React.ReactNode }) {
  const [instance, setInstance] = useState<WebContainer | null>(null)
  const [status, setStatus] = useState<WebcontainerStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isWebcontainerEnabled() || !hasSharedArrayBufferSupport()) {
      setStatus('unsupported')
      return
    }

    let isMounted = true
    setStatus('booting')

    getWebcontainerInstance()
      .then((webcontainer) => {
        if (!isMounted) return
        console.log('[WebContainer] Boot successful.')
        setInstance(webcontainer)
        setStatus('ready')
      })
      .catch((bootError: unknown) => {
        if (!isMounted) return
        const message = bootError instanceof Error ? bootError.message : 'Failed to boot WebContainer'
        if (process.env.NODE_ENV !== 'production') {
          console.warn('WebContainer boot failed; falling back to server execution.', {
            crossOriginIsolated: window.crossOriginIsolated,
            hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
            message,
          })
        }
        setError(message)
        setStatus('error')
      })

    return () => {
      isMounted = false
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
