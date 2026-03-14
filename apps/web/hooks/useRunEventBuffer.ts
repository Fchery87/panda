'use client'

import { useCallback, useRef, useState } from 'react'
import type { Id } from '@convex/_generated/dataModel'

export type TracePersistenceStatus = 'live' | 'degraded'

interface UseRunEventBufferOptions<TEvent extends object> {
  appendRunEvents: (args: {
    runId: Id<'agentRuns'>
    events: Array<TEvent & { sequence: number }>
  }) => Promise<unknown>
  onError: (message: string, error: unknown) => void
  flushDelayMs?: number
  retryDelayMs?: number
  flushThreshold?: number
}

interface BufferedRunEvent<TEvent extends object> {
  runId: Id<'agentRuns'>
  event: TEvent & { sequence: number }
}

export function groupBufferedRunEvents<TEvent extends object>(
  entries: Array<BufferedRunEvent<TEvent>>
): Map<Id<'agentRuns'>, Array<TEvent & { sequence: number }>> {
  const grouped = new Map<Id<'agentRuns'>, Array<TEvent & { sequence: number }>>()

  for (const entry of entries) {
    const events = grouped.get(entry.runId)
    if (events) {
      events.push(entry.event)
    } else {
      grouped.set(entry.runId, [entry.event])
    }
  }

  for (const events of grouped.values()) {
    events.sort((a, b) => a.sequence - b.sequence)
  }

  return grouped
}

export function useRunEventBuffer<TEvent extends object>({
  appendRunEvents,
  onError,
  flushDelayMs = 400,
  retryDelayMs = 1000,
  flushThreshold = 10,
}: UseRunEventBufferOptions<TEvent>) {
  const [tracePersistenceStatus, setTracePersistenceStatus] =
    useState<TracePersistenceStatus>('live')

  const runIdRef = useRef<Id<'agentRuns'> | null>(null)
  const runSequenceRef = useRef(0)
  const runEventBufferRef = useRef<Array<BufferedRunEvent<TEvent>>>([])
  const runEventFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runEventFlushPromiseRef = useRef<Promise<void> | null>(null)
  const runEventFlushAgainRef = useRef(false)
  const runEventFlushAgainForceRef = useRef(false)
  const tracePersistenceStatusRef = useRef<TracePersistenceStatus>('live')

  const setTraceStatus = useCallback((next: TracePersistenceStatus) => {
    if (tracePersistenceStatusRef.current === next) return
    tracePersistenceStatusRef.current = next
    setTracePersistenceStatus(next)
  }, [])

  const beginRun = useCallback((runId: Id<'agentRuns'>) => {
    runIdRef.current = runId
    runSequenceRef.current = 0
  }, [])

  const clearRun = useCallback(() => {
    runIdRef.current = null
    runSequenceRef.current = 0
  }, [])

  const flushRunEventBuffer = useCallback(
    async (options?: { force?: boolean; reason?: string }) => {
      if (runEventFlushTimerRef.current !== null) {
        clearTimeout(runEventFlushTimerRef.current)
        runEventFlushTimerRef.current = null
      }

      if (runEventFlushPromiseRef.current) {
        runEventFlushAgainRef.current = true
        if (options?.force) {
          runEventFlushAgainForceRef.current = true
        }
        if (options?.force) {
          await runEventFlushPromiseRef.current
          await flushRunEventBuffer({ ...options, force: true })
        }
        return
      }

      if (runEventBufferRef.current.length === 0) return

      const doFlush = async () => {
        const pending = runEventBufferRef.current.splice(0, runEventBufferRef.current.length)
        if (pending.length === 0) return

        const grouped = groupBufferedRunEvents(pending)

        try {
          for (const [runId, events] of grouped) {
            await appendRunEvents({ runId, events })
          }
          setTraceStatus('live')
        } catch (error) {
          runEventBufferRef.current = [...pending, ...runEventBufferRef.current]
          setTraceStatus('degraded')
          onError(
            `Failed to flush run event buffer${options?.reason ? ` (${options.reason})` : ''}`,
            error
          )
          if (runEventFlushTimerRef.current === null) {
            runEventFlushTimerRef.current = setTimeout(() => {
              runEventFlushTimerRef.current = null
              void flushRunEventBuffer({ reason: 'retry' })
            }, retryDelayMs)
          }
        }
      }

      runEventFlushPromiseRef.current = doFlush().finally(() => {
        runEventFlushPromiseRef.current = null
      })
      await runEventFlushPromiseRef.current

      if (runEventFlushAgainRef.current) {
        const pendingForce = runEventFlushAgainForceRef.current
        runEventFlushAgainRef.current = false
        runEventFlushAgainForceRef.current = false
        if (runEventBufferRef.current.length > 0) {
          await flushRunEventBuffer({
            ...options,
            force: Boolean(options?.force) || pendingForce,
          })
        }
      }
    },
    [appendRunEvents, onError, retryDelayMs, setTraceStatus]
  )

  const scheduleRunEventFlush = useCallback(() => {
    if (runEventFlushTimerRef.current !== null) return
    runEventFlushTimerRef.current = setTimeout(() => {
      runEventFlushTimerRef.current = null
      void flushRunEventBuffer({ reason: 'timer' })
    }, flushDelayMs)
  }, [flushDelayMs, flushRunEventBuffer])

  const appendRunEvent = useCallback(
    async (event: TEvent, options?: { forceFlush?: boolean }) => {
      const runId = runIdRef.current
      if (!runId) return

      runSequenceRef.current += 1
      runEventBufferRef.current.push({
        runId,
        event: { sequence: runSequenceRef.current, ...event },
      })

      if (runEventBufferRef.current.length >= flushThreshold || options?.forceFlush) {
        await flushRunEventBuffer({
          force: Boolean(options?.forceFlush),
          reason: options?.forceFlush ? 'force' : 'threshold',
        })
        return
      }

      scheduleRunEventFlush()
    },
    [flushRunEventBuffer, flushThreshold, scheduleRunEventFlush]
  )

  return {
    tracePersistenceStatus,
    runIdRef,
    beginRun,
    clearRun,
    appendRunEvent,
    flushRunEventBuffer,
  }
}
