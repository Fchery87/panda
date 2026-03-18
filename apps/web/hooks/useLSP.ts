// apps/web/hooks/useLSP.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Diagnostic, Position } from 'vscode-languageserver-protocol'
import { getLSPClient, LSPClient } from '@/lib/lsp/client'

interface UseLSPOptions {
  filePath: string
  content: string
  languageId: string
  enabled?: boolean
}

interface UseLSPReturn {
  client: LSPClient | null
  isConnected: boolean
  diagnostics: Diagnostic[]
  getCompletions: (position: Position) => ReturnType<LSPClient['getCompletions']>
  getHover: (position: Position) => ReturnType<LSPClient['getHover']>
  getDefinition: (position: Position) => ReturnType<LSPClient['getDefinition']>
  formatDocument: () => ReturnType<LSPClient['formatDocument']>
  openDocument: () => void
  changeDocument: (newContent: string) => void
  closeDocument: () => void
}

/**
 * React hook for Language Server Protocol integration
 * Manages connection and document lifecycle
 */
export function useLSP({
  filePath,
  content,
  languageId,
  enabled = true,
}: UseLSPOptions): UseLSPReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([])
  const clientRef = useRef<LSPClient | null>(null)
  const isConnectingRef = useRef(false)
  const documentUriRef = useRef(`file://${filePath}`)

  // Create LSP client instance
  useEffect(() => {
    if (!enabled) return

    if (!clientRef.current) {
      clientRef.current = getLSPClient({
        onDiagnostics: (_uri, diags) => {
          setDiagnostics(diags)
        },
        onConnectionError: (err) => {
          console.error('[useLSP] Connection error:', err)
          setIsConnected(false)
        },
      })
    }

    return () => {
      // Don't disconnect on unmount, just close the document
      if (clientRef.current?.connected) {
        clientRef.current.didClose(documentUriRef.current)
      }
    }
  }, [enabled])

  // Connect to LSP server
  useEffect(() => {
    if (!enabled || !clientRef.current || isConnectingRef.current) return

    const connect = async () => {
      if (clientRef.current?.connected) {
        setIsConnected(true)
        return
      }

      isConnectingRef.current = true
      try {
        await clientRef.current?.connect()
        setIsConnected(true)
      } catch (err) {
        console.error('[useLSP] Failed to connect:', err)
        setIsConnected(false)
      } finally {
        isConnectingRef.current = false
      }
    }

    connect()
  }, [enabled])

  // Open document when connected
  const openDocument = useCallback(() => {
    if (!clientRef.current?.connected) return

    const uri = documentUriRef.current
    clientRef.current.didOpen(uri, languageId, 1, content)
  }, [languageId, content])

  // Open document when connection is established
  useEffect(() => {
    if (isConnected && clientRef.current) {
      openDocument()
    }
  }, [isConnected, openDocument])

  // Update document URI when filePath changes
  useEffect(() => {
    const newUri = `file://${filePath}`
    if (newUri !== documentUriRef.current && clientRef.current?.connected) {
      // Close old document
      clientRef.current.didClose(documentUriRef.current)
      // Open new document
      documentUriRef.current = newUri
      clientRef.current.didOpen(newUri, languageId, 1, content)
    }
  }, [filePath, languageId, content])

  // Send document changes
  const changeDocument = useCallback((newContent: string) => {
    if (!clientRef.current?.connected) return

    const uri = documentUriRef.current
    clientRef.current.didChange(uri, [
      {
        text: newContent,
      },
    ])
  }, [])

  // Close document
  const closeDocument = useCallback(() => {
    if (!clientRef.current?.connected) return

    const uri = documentUriRef.current
    clientRef.current.didClose(uri)
  }, [])

  // Get completions
  const getCompletions = useCallback(async (position: Position) => {
    if (!clientRef.current?.connected) return null
    return clientRef.current.getCompletions(documentUriRef.current, position)
  }, [])

  // Get hover
  const getHover = useCallback(async (position: Position) => {
    if (!clientRef.current?.connected) return null
    return clientRef.current.getHover(documentUriRef.current, position)
  }, [])

  // Get definition
  const getDefinition = useCallback(async (position: Position) => {
    if (!clientRef.current?.connected) return null
    return clientRef.current.getDefinition(documentUriRef.current, position)
  }, [])

  // Format document
  const formatDocument = useCallback(async () => {
    if (!clientRef.current?.connected) return null
    return clientRef.current.formatDocument(documentUriRef.current)
  }, [])

  return {
    client: clientRef.current,
    isConnected,
    diagnostics,
    getCompletions,
    getHover,
    getDefinition,
    formatDocument,
    openDocument,
    changeDocument,
    closeDocument,
  }
}
