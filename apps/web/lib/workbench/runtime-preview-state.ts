'use client'

import { useCallback, useSyncExternalStore } from 'react'

export type RuntimePreviewStatus = 'idle' | 'starting' | 'running'

export interface RuntimePreviewState {
  status: RuntimePreviewStatus
  previewUrl: string | null
  activeCommand: string | null
  updatedAt: number
}

type RuntimeJobLike = {
  command: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
}

const STORAGE_PREFIX = 'panda:runtime-preview:'
const DEFAULT_PORT = 3000
const DEFAULT_STATE: RuntimePreviewState = {
  status: 'idle',
  previewUrl: null,
  activeCommand: null,
  updatedAt: 0,
}

const DEV_SERVER_PATTERNS = [
  /\bnext\s+dev\b/iu,
  /\bvite\b/iu,
  /\bbun\s+run\s+dev\b/iu,
  /\bnpm\s+run\s+dev\b/iu,
  /\bpnpm\s+dev\b/iu,
  /\byarn\s+dev\b/iu,
]

const stateCache = new Map<string, RuntimePreviewState>()
const listenerMap = new Map<string, Set<() => void>>()

function getStorageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`
}

function readStoredState(projectId: string): RuntimePreviewState {
  const cached = stateCache.get(projectId)
  if (cached) return cached

  if (typeof window === 'undefined') {
    return DEFAULT_STATE
  }

  const raw = window.localStorage.getItem(getStorageKey(projectId))
  if (!raw) {
    stateCache.set(projectId, DEFAULT_STATE)
    return DEFAULT_STATE
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RuntimePreviewState>
    const nextState: RuntimePreviewState = {
      status:
        parsed.status === 'starting' || parsed.status === 'running' || parsed.status === 'idle'
          ? parsed.status
          : 'idle',
      previewUrl: typeof parsed.previewUrl === 'string' ? parsed.previewUrl : null,
      activeCommand: typeof parsed.activeCommand === 'string' ? parsed.activeCommand : null,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    }
    stateCache.set(projectId, nextState)
    return nextState
  } catch {
    stateCache.set(projectId, DEFAULT_STATE)
    return DEFAULT_STATE
  }
}

function persistState(projectId: string, state: RuntimePreviewState): void {
  stateCache.set(projectId, state)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(getStorageKey(projectId), JSON.stringify(state))
  }
}

function emit(projectId: string): void {
  const listeners = listenerMap.get(projectId)
  if (!listeners) return
  for (const listener of listeners) {
    listener()
  }
}

function parsePort(command: string): number {
  const patterns = [
    /\bPORT=(\d{2,5})\b/u,
    /--port(?:=|\s+)(\d{2,5})/u,
    /(?:^|\s)-p\s+(\d{2,5})(?:\s|$)/u,
  ]

  for (const pattern of patterns) {
    const value = command.match(pattern)?.[1]
    if (!value) continue
    const port = Number.parseInt(value, 10)
    if (Number.isInteger(port) && port > 0 && port <= 65535) {
      return port
    }
  }

  return DEFAULT_PORT
}

export function getRuntimePreviewState(projectId: string): RuntimePreviewState {
  return readStoredState(projectId)
}

export function subscribeRuntimePreview(projectId: string, listener: () => void): () => void {
  const listeners = listenerMap.get(projectId) ?? new Set<() => void>()
  listeners.add(listener)
  listenerMap.set(projectId, listeners)

  return () => {
    const current = listenerMap.get(projectId)
    if (!current) return
    current.delete(listener)
    if (current.size === 0) {
      listenerMap.delete(projectId)
    }
  }
}

export function setRuntimePreviewState(
  projectId: string,
  nextState: RuntimePreviewState | ((currentState: RuntimePreviewState) => RuntimePreviewState)
): void {
  const resolved =
    typeof nextState === 'function' ? nextState(readStoredState(projectId)) : nextState
  persistState(projectId, resolved)
  emit(projectId)
}

export function clearRuntimePreviewState(projectId: string): void {
  setRuntimePreviewState(projectId, {
    ...DEFAULT_STATE,
    updatedAt: Date.now(),
  })
}

export function getRuntimePreviewFromCommand(command: string): RuntimePreviewState | null {
  const trimmedCommand = command.trim()
  if (!trimmedCommand) return null

  const isDevServer = DEV_SERVER_PATTERNS.some((pattern) => pattern.test(trimmedCommand))
  if (!isDevServer) return null

  const port = parsePort(trimmedCommand)
  return {
    status: 'starting',
    previewUrl: `http://localhost:${port}`,
    activeCommand: trimmedCommand,
    updatedAt: Date.now(),
  }
}

export function startRuntimePreview(
  projectId: string,
  command: string
): RuntimePreviewState | null {
  const previewState = getRuntimePreviewFromCommand(command)
  if (!previewState) return null
  setRuntimePreviewState(projectId, previewState)
  return previewState
}

export function reconcileRuntimePreviewState(
  projectId: string,
  currentState: RuntimePreviewState,
  jobs: RuntimeJobLike[] | undefined
): void {
  if (!currentState.activeCommand) return

  const matchingJobs = jobs?.filter((job) => job.command === currentState.activeCommand) ?? []
  if (matchingJobs.some((job) => job.status === 'running')) {
    if (currentState.status !== 'running') {
      setRuntimePreviewState(projectId, {
        ...currentState,
        status: 'running',
        updatedAt: Date.now(),
      })
    }
    return
  }

  if (matchingJobs.some((job) => job.status === 'queued')) {
    if (currentState.status !== 'starting') {
      setRuntimePreviewState(projectId, {
        ...currentState,
        status: 'starting',
        updatedAt: Date.now(),
      })
    }
    return
  }

  if (matchingJobs.length > 0) {
    clearRuntimePreviewState(projectId)
  }
}

export function useProjectRuntimePreview(projectId: string): RuntimePreviewState {
  const subscribe = useCallback(
    (listener: () => void) => subscribeRuntimePreview(projectId, listener),
    [projectId]
  )
  const getSnapshot = useCallback(() => getRuntimePreviewState(projectId), [projectId])

  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_STATE)
}
