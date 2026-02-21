/**
 * Event Bus - Real-time event publishing and subscription
 *
 * Provides a centralized event system for:
 * - Session/message/part updates
 * - Tool execution events
 * - Permission requests
 * - Compaction events
 * - Error handling
 */

import type { Event, EventType, EventHandler, Identifier } from './types'

type Subscription = {
  id: Identifier
  handler: EventHandler
  filter?: (event: Event) => boolean
}

class EventBus {
  private subscriptions: Map<Identifier, Subscription> = new Map()
  private eventHistory: Event[] = []
  private maxHistorySize = 1000

  /**
   * Subscribe to events
   */
  subscribe(
    handler: EventHandler,
    options?: {
      filter?: (event: Event) => boolean
      replayHistory?: boolean
    }
  ): () => void {
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    this.subscriptions.set(id, {
      id,
      handler,
      filter: options?.filter,
    })

    if (options?.replayHistory) {
      for (const event of this.eventHistory) {
        if (!options.filter || options.filter(event)) {
          handler(event)
        }
      }
    }

    return () => {
      this.subscriptions.delete(id)
    }
  }

  /**
   * Subscribe to specific event types
   */
  on(
    types: EventType | EventType[],
    handler: EventHandler,
    options?: { filter?: (event: Event) => boolean }
  ): () => void {
    const typeSet = new Set(Array.isArray(types) ? types : [types])

    return this.subscribe(handler, {
      filter: (event) => {
        if (!typeSet.has(event.type)) return false
        return options?.filter ? options.filter(event) : true
      },
    })
  }

  /**
   * Publish an event to all subscribers
   */
  emit(type: EventType, sessionID: Identifier, payload: unknown): void {
    const event: Event = {
      type,
      sessionID,
      timestamp: Date.now(),
      payload,
    }

    this.eventHistory.push(event)

    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize)
    }

    for (const subscription of this.subscriptions.values()) {
      try {
        if (!subscription.filter || subscription.filter(event)) {
          subscription.handler(event)
        }
      } catch (error) {
        console.error('[EventBus] Handler error:', error)
      }
    }
  }

  /**
   * Emit session event
   */
  emitSession(
    sessionID: Identifier,
    action: 'created' | 'updated' | 'deleted',
    payload: unknown
  ): void {
    this.emit(`session.${action}` as EventType, sessionID, payload)
  }

  /**
   * Emit message event
   */
  emitMessage(
    sessionID: Identifier,
    action: 'created' | 'updated' | 'deleted',
    payload: unknown
  ): void {
    this.emit(`message.${action}` as EventType, sessionID, payload)
  }

  /**
   * Emit part event
   */
  emitPart(
    sessionID: Identifier,
    action: 'created' | 'updated' | 'deleted',
    payload: unknown
  ): void {
    this.emit(`part.${action}` as EventType, sessionID, payload)
  }

  /**
   * Emit tool event
   */
  emitTool(
    sessionID: Identifier,
    status: 'executing' | 'completed' | 'failed',
    payload: unknown
  ): void {
    this.emit(`tool.${status}` as EventType, sessionID, payload)
  }

  /**
   * Emit compaction event
   */
  emitCompaction(sessionID: Identifier, status: 'started' | 'completed', payload: unknown): void {
    this.emit(`compaction.${status}` as EventType, sessionID, payload)
  }

  /**
   * Emit permission event
   */
  emitPermission(sessionID: Identifier, status: 'requested' | 'decided', payload: unknown): void {
    this.emit(`permission.${status}` as EventType, sessionID, payload)
  }

  /**
   * Emit error event
   */
  emitError(sessionID: Identifier, error: unknown): void {
    this.emit('error', sessionID, error)
  }

  /**
   * Get event history
   */
  getHistory(options?: {
    sessionID?: Identifier
    types?: EventType[]
    since?: number
    limit?: number
  }): Event[] {
    let events = [...this.eventHistory]

    if (options?.sessionID) {
      events = events.filter((e) => e.sessionID === options.sessionID)
    }

    if (options?.types) {
      const typeSet = new Set(options.types)
      events = events.filter((e) => typeSet.has(e.type))
    }

    if (options?.since) {
      events = events.filter((e) => e.timestamp >= options.since!)
    }

    if (options?.limit) {
      events = events.slice(-options.limit)
    }

    return events
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = []
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size
  }
}

export const bus = new EventBus()

export type { Event, EventType, EventHandler }
