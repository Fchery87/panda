/**
 * Permission System - Granular access control for tools
 *
 * Implements allow/deny/ask patterns with glob matching
 * for file paths and command patterns
 */

import type {
  Permission,
  PermissionDecision,
  PermissionRequest,
  PermissionResult,
  Identifier,
} from './types'
import { ascending } from './identifier'
import { bus } from './event-bus'

/**
 * Wildcard pattern matching
 */
function matchPattern(pattern: string, value: string): boolean {
  if (pattern === '*') return true
  if (pattern === value) return true

  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')

  try {
    return new RegExp(`^${regexPattern}$`, 'i').test(value)
  } catch (error) {
    void error
    return false
  }
}

/**
 * Check if a tool/path matches any permission pattern
 */
export function checkPermission(
  permissions: Permission,
  tool: string,
  pattern?: string
): PermissionDecision {
  const patterns = Object.keys(permissions).sort((a, b) => {
    const aHasPath = a.includes(':')
    const bHasPath = b.includes(':')
    if (aHasPath !== bHasPath) {
      return aHasPath ? -1 : 1
    }
    const aSpecificity = (a.match(/\*/g) || []).length
    const bSpecificity = (b.match(/\*/g) || []).length
    return aSpecificity - bSpecificity
  })

  for (const permPattern of patterns) {
    const [permTool, permPath] = permPattern.split(':', 2)

    if (!matchPattern(permTool, tool)) continue

    if (permPath && pattern) {
      if (matchPattern(permPath, pattern)) {
        return permissions[permPattern] ?? 'ask'
      }
    } else if (!permPath) {
      return permissions[permPattern] ?? 'ask'
    }
  }

  if (pattern) {
    return checkPermission(permissions, tool)
  }

  return 'ask'
}

/**
 * Merge two permission sets (later takes precedence)
 */
export function mergePermissions(base: Permission, override: Permission): Permission {
  return { ...base, ...override }
}

/**
 * Intersect two permission decisions using least privilege
 */
export function intersectPermissionDecisions(
  parent: PermissionDecision,
  child: PermissionDecision
): PermissionDecision {
  if (parent === 'deny' || child === 'deny') return 'deny'
  if (parent === 'allow' && child === 'allow') return 'allow'
  return 'ask'
}

/**
 * Intersect parent and child permission sets using least privilege.
 *
 * Any tool not explicitly present remains implicit and falls back to `ask`
 * via `checkPermission`.
 */
export function intersectPermissions(parent: Permission, child: Permission): Permission {
  const merged: Permission = {}
  const keys = new Set([...Object.keys(parent), ...Object.keys(child)])

  for (const key of keys) {
    const [tool, pattern] = key.split(':', 2)
    const parentDecision = checkPermission(parent, tool, pattern || undefined)
    const childDecision = checkPermission(child, tool, pattern || undefined)
    merged[key] = intersectPermissionDecisions(parentDecision, childDecision)
  }

  return merged
}

/**
 * Default permissions for built-in agents
 */
export const DEFAULT_PERMISSIONS: Record<string, Permission> = {
  build: {
    read_files: 'allow',
    list_directory: 'allow',
    write_files: 'allow',
    run_command: 'allow',
    search_codebase: 'allow',
    search_code: 'allow',
    search_code_ast: 'allow',
    update_memory_bank: 'allow',
    task: 'allow',
    question: 'deny',
  },
  plan: {
    read_files: 'allow',
    list_directory: 'allow',
    search_codebase: 'allow',
    search_code: 'allow',
    search_code_ast: 'allow',
    write_files: 'deny',
    run_command: 'ask',
    update_memory_bank: 'allow',
    task: 'allow',
  },
  ask: {
    read_files: 'allow',
    list_directory: 'allow',
    search_codebase: 'allow',
    search_code: 'allow',
    search_code_ast: 'allow',
    write_files: 'deny',
    run_command: 'deny',
    task: 'deny',
  },
}

/**
 * Permission manager class
 */
export class PermissionManager {
  private timeoutMs: number
  private pollIntervalMs: number
  private pendingRequests: Map<Identifier, PermissionRequest> = new Map()
  private sessionPermissions: Map<Identifier, Permission> = new Map()
  private userDecisions: Map<string, PermissionDecision> = new Map()

  constructor(options?: { timeoutMs?: number; pollIntervalMs?: number }) {
    this.timeoutMs = options?.timeoutMs ?? 60000
    this.pollIntervalMs = options?.pollIntervalMs ?? 100
  }

  /**
   * Request permission for a tool execution
   */
  async request(
    sessionID: Identifier,
    messageID: Identifier,
    tool: string,
    pattern: string,
    metadata?: Record<string, unknown>
  ): Promise<PermissionResult> {
    const id = ascending('perm_')

    const request: PermissionRequest = {
      sessionID,
      messageID,
      tool,
      pattern,
      metadata,
    }

    const decisionKey = `${sessionID}:${tool}:${pattern}`

    const cachedDecision = this.userDecisions.get(decisionKey)
    if (cachedDecision) {
      return {
        granted: cachedDecision === 'allow',
        decision: cachedDecision,
        reason: 'Cached decision',
      }
    }

    const sessionPerms = this.sessionPermissions.get(sessionID) ?? {}
    const decision = checkPermission(sessionPerms, tool, pattern)

    if (decision !== 'ask') {
      return {
        granted: decision === 'allow',
        decision,
      }
    }

    this.pendingRequests.set(id, request)

    bus.emitPermission(sessionID, 'requested', {
      id,
      request,
    })

    return new Promise((resolve) => {
      let resolved = false

      const checkInterval = setInterval(() => {
        const req = this.pendingRequests.get(id)
        if (resolved || !req?.decision) {
          return
        }
        resolved = true
        clearInterval(checkInterval)
        this.pendingRequests.delete(id)

        const granted = req.decision === 'allow'

        if (req.reason === 'always') {
          this.userDecisions.set(decisionKey, req.decision)
        }

        bus.emitPermission(sessionID, 'decided', {
          id,
          decision: req.decision,
          reason: req.reason,
        })

        resolve({
          granted,
          decision: req.decision,
          reason: req.reason,
        })
      }, this.pollIntervalMs)

      setTimeout(() => {
        if (resolved) return
        resolved = true
        clearInterval(checkInterval)
        this.pendingRequests.delete(id)
        bus.emitPermission(sessionID, 'decided', {
          id,
          decision: 'deny',
          reason: 'Timeout',
        })
        resolve({
          granted: false,
          decision: 'deny',
          reason: 'Timeout',
        })
      }, this.timeoutMs)
    })
  }

  /**
   * Respond to a permission request
   */
  respond(requestID: Identifier, decision: PermissionDecision, reason?: string): boolean {
    const request = this.pendingRequests.get(requestID)
    if (!request) return false

    request.decision = decision
    request.reason = reason
    return true
  }

  /**
   * Set session-level permissions
   */
  setSessionPermissions(sessionID: Identifier, permissions: Permission): void {
    this.sessionPermissions.set(sessionID, permissions)
  }

  /**
   * Get session-level permissions
   */
  getSessionPermissions(sessionID: Identifier): Permission | undefined {
    return this.sessionPermissions.get(sessionID)
  }

  /**
   * Clear cached decisions
   */
  clearCache(): void {
    this.userDecisions.clear()
  }

  /**
   * Clear all state for a session
   */
  clearSession(sessionID: Identifier): void {
    this.sessionPermissions.delete(sessionID)
    // Also clear decisions scoped to this session
    for (const key of this.userDecisions.keys()) {
      if (key.startsWith(`${sessionID}:`)) {
        this.userDecisions.delete(key)
      }
    }
  }

  /**
   * Get pending requests
   */
  getPendingRequests(): PermissionRequest[] {
    return Array.from(this.pendingRequests.values())
  }
}

export const permissions = new PermissionManager()
