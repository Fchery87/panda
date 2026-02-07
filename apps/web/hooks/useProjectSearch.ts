'use client'

import { useCallback, useRef, useState } from 'react'
import type { SearchMatch } from '@/lib/agent/search/types'

export interface ProjectSearchOptions {
  mode?: 'literal' | 'regex'
  caseSensitive?: boolean
  includeGlobs?: string[]
  excludeGlobs?: string[]
  paths?: string[]
  maxResults?: number
  maxMatchesPerFile?: number
  contextLines?: number
  timeoutMs?: number
}

export interface ProjectSearchState {
  query: string
  isLoading: boolean
  error: string | null
  engine: string | null
  warnings: string[]
  truncated: boolean
  stats: {
    durationMs: number
    filesMatched: number
    matchesReturned: number
  } | null
  matches: SearchMatch[]
}

const DEBOUNCE_MS = 220

export function useProjectSearch() {
  const [state, setState] = useState<ProjectSearchState>({
    query: '',
    isLoading: false,
    error: null,
    engine: null,
    warnings: [],
    truncated: false,
    stats: null,
    matches: [],
  })

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const clearSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setState((prev) => ({
      ...prev,
      query: '',
      isLoading: false,
      error: null,
      engine: null,
      warnings: [],
      truncated: false,
      stats: null,
      matches: [],
    }))
  }, [])

  const search = useCallback(async (query: string, options: ProjectSearchOptions = {}) => {
    const trimmed = query.trim()

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    if (!trimmed) {
      setState((prev) => ({
        ...prev,
        query: '',
        isLoading: false,
        error: null,
        engine: null,
        warnings: [],
        truncated: false,
        stats: null,
        matches: [],
      }))
      return
    }

    setState((prev) => ({
      ...prev,
      query: trimmed,
      isLoading: true,
      error: null,
    }))

    await new Promise<void>((resolve) => {
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null
        resolve()
      }, DEBOUNCE_MS)
    })

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'text',
          query: trimmed,
          mode: options.mode ?? 'literal',
          caseSensitive: options.caseSensitive ?? false,
          includeGlobs: options.includeGlobs,
          excludeGlobs: options.excludeGlobs,
          paths: options.paths,
          maxResults: options.maxResults,
          maxMatchesPerFile: options.maxMatchesPerFile,
          contextLines: options.contextLines,
          timeoutMs: options.timeoutMs,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error || 'Search failed')
      }

      const payload = (await response.json()) as {
        engine: string
        warnings: string[]
        truncated: boolean
        stats: {
          durationMs: number
          filesMatched: number
          matchesReturned: number
        }
        matches: SearchMatch[]
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
        engine: payload.engine,
        warnings: payload.warnings,
        truncated: payload.truncated,
        stats: payload.stats,
        matches: payload.matches,
      }))
    } catch (error) {
      if (controller.signal.aborted) return
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Search failed',
        engine: null,
        warnings: [],
        truncated: false,
        stats: null,
        matches: [],
      }))
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }, [])

  return {
    state,
    search,
    clearSearch,
  }
}
