/**
 * PermissionDialog Component
 *
 * Displays inline permission requests with timeout countdown.
 * Subscribes to event bus permission.requested events.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { bus } from '@/lib/agent/harness/event-bus'
import { permissions } from '@/lib/agent/harness/permissions'
import type { PermissionDecision, PermissionRequest } from '@/lib/agent/harness/types'
import type { Identifier } from '@/lib/agent/harness/types'
import {
  Shield,
  AlertTriangle,
  FileEdit,
  Terminal,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react'

interface PermissionRequestWithID {
  id: Identifier
  request: PermissionRequest
  timestamp: number
}

interface PermissionCardProps {
  request: PermissionRequestWithID
  onRespond: (id: Identifier, decision: PermissionDecision, reason?: string) => void
  timeoutMs: number
  onTimeout: (id: Identifier) => void
}

function PermissionCard({ request, onRespond, timeoutMs, onTimeout }: PermissionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(timeoutMs)
  const [decisionMade, setDecisionMade] = useState(false)

  const startTimeRef = useRef(request.timestamp)
  const tool = request.request.tool
  const pattern = request.request.pattern
  const metadata = request.request.metadata
  const detailArgs =
    metadata && typeof metadata === 'object' && 'args' in metadata ? metadata.args : undefined

  // Determine risk tier based on tool
  const getRiskTier = (toolName: string): 'low' | 'medium' | 'high' => {
    if (['write_files', 'apply_patch', 'run_command'].includes(toolName)) {
      return 'high'
    }
    if (['update_memory_bank', 'task'].includes(toolName)) {
      return 'medium'
    }
    return 'low'
  }

  const riskTier = getRiskTier(tool)
  const riskColors = {
    low: 'border-green-500/50 bg-green-500/5 text-green-600',
    medium: 'border-yellow-500/50 bg-yellow-500/5 text-yellow-600',
    high: 'border-red-500/50 bg-red-500/5 text-red-600',
  }

  const riskLabels = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
  }

  // Countdown timer
  useEffect(() => {
    if (decisionMade) return

    const updateTimer = () => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, timeoutMs - elapsed)
      setTimeRemaining(remaining)

      if (remaining === 0) {
        onTimeout(request.id)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 100)

    return () => clearInterval(interval)
  }, [timeoutMs, request.id, decisionMade, onTimeout])

  const handleDecision = (decision: PermissionDecision, reason?: string) => {
    setDecisionMade(true)
    onRespond(request.id, decision, reason)
  }

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000)
    return `${seconds}s`
  }

  const getToolIcon = (toolName: string) => {
    if (toolName === 'write_files' || toolName === 'apply_patch') {
      return <FileEdit className="h-4 w-4" />
    }
    if (toolName === 'run_command') {
      return <Terminal className="h-4 w-4" />
    }
    return <Shield className="h-4 w-4" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'surface-1 shadow-sharp-md border-l-4 p-3',
        riskColors[riskTier].split(' ')[0],
        decisionMade && 'opacity-50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', riskColors[riskTier].split(' ')[2])}>
          {riskTier === 'high' ? <AlertTriangle className="h-5 w-5" /> : getToolIcon(tool)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono text-xs font-semibold">{tool}</span>
            <span
              className={cn('px-1.5 py-0.5 font-mono text-[10px] uppercase', riskColors[riskTier])}
            >
              {riskLabels[riskTier]}
            </span>
            {timeRemaining <= 10000 && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-red-500">
                <Clock className="h-3 w-3" />
                {formatTime(timeRemaining)}
              </span>
            )}
          </div>

          {pattern && (
            <div className="mb-2 truncate font-mono text-xs text-muted-foreground">{pattern}</div>
          )}

          {/* Progress bar for timeout */}
          <div className="mb-3 h-1 overflow-hidden bg-border">
            <motion.div
              className={cn('h-full', timeRemaining <= 10000 ? 'bg-red-500' : 'bg-primary')}
              initial={{ width: '100%' }}
              animate={{ width: `${(timeRemaining / timeoutMs) * 100}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>

          {/* Expandable args */}
          {detailArgs !== undefined && (
            <div className="mb-3">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? 'Hide details' : 'Show details'}
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.pre
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-2 overflow-x-auto rounded-none bg-secondary/50 p-2 font-mono text-[10px]"
                  >
                    {JSON.stringify(detailArgs, null, 2)}
                  </motion.pre>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDecision('allow')}
              disabled={decisionMade}
              className="h-7 rounded-none border-green-500/50 px-2 font-mono text-xs hover:bg-green-500/10 hover:text-green-600"
            >
              Allow Once
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDecision('allow', 'always')}
              disabled={decisionMade}
              className="h-7 rounded-none border-primary/50 px-2 font-mono text-xs hover:bg-primary/10"
            >
              Always
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDecision('deny')}
              disabled={decisionMade}
              className="ml-auto h-7 rounded-none border-red-500/50 px-2 font-mono text-xs hover:bg-red-500/10 hover:text-red-600"
            >
              Deny
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

interface PermissionDialogProps {
  /** Timeout in milliseconds for permission requests (default: 60000) */
  timeoutMs?: number
  /** Maximum number of pending requests to show (default: 5) */
  maxPending?: number
  className?: string
}

export function PermissionDialog({
  timeoutMs = 60000,
  maxPending = 5,
  className,
}: PermissionDialogProps) {
  const [pendingRequests, setPendingRequests] = useState<PermissionRequestWithID[]>([])

  // Subscribe to permission events
  useEffect(() => {
    // Handle permission requested events
    const unsubscribe = bus.on('permission.requested', (event) => {
      const payload = event.payload as { id: Identifier; request: PermissionRequest }

      setPendingRequests((prev) => {
        // Avoid duplicates
        if (prev.some((r) => r.id === payload.id)) {
          return prev
        }

        const newRequest: PermissionRequestWithID = {
          id: payload.id,
          request: payload.request,
          timestamp: Date.now(),
        }

        return [...prev, newRequest].slice(-maxPending)
      })
    })

    // Handle permission decided events (remove from pending)
    const unsubscribeDecided = bus.on('permission.decided', (event) => {
      const payload = event.payload as {
        id: Identifier
        decision: PermissionDecision
        reason?: string
      }

      setPendingRequests((prev) => prev.filter((r) => r.id !== payload.id))
    })

    return () => {
      unsubscribe()
      unsubscribeDecided()
    }
  }, [maxPending])

  const handleRespond = useCallback(
    (id: Identifier, decision: PermissionDecision, reason?: string) => {
      const success = permissions.respond(id, decision, reason)

      if (success) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== id))
      }
    },
    []
  )

  const handleTimeout = useCallback((id: Identifier) => {
    // Auto-deny on timeout
    permissions.respond(id, 'deny', 'Timeout')

    setPendingRequests((prev) => prev.filter((r) => r.id !== id))
  }, [])

  if (pendingRequests.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      <AnimatePresence mode="popLayout">
        {pendingRequests.map((request) => (
          <PermissionCard
            key={request.id}
            request={request}
            onRespond={handleRespond}
            timeoutMs={timeoutMs}
            onTimeout={handleTimeout}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

export default PermissionDialog
