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
  } catch {
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
 * Default permissions for built-in agents
 */
export const DEFAULT_PERMISSIONS: Record<string, Permission> = {
  build: {
    read_files: 'allow',
    list_directory: 'allow',
    write_files: 'allow',
    run_command: 'allow',
    search_code: 'allow',
    search_code_ast: 'allow',
    update_memory_bank: 'allow',
    task: 'allow',
    question: 'allow',
  },
  plan: {
    read_files: 'allow',
    list_directory: 'allow',
    search_code: 'allow',
    search_code_ast: 'allow',
    write_files: 'deny',
    run_command: 'ask',
    update_memory_bank: 'allow',
  },
  ask: {
    read_files: 'allow',
    list_directory: 'allow',
    search_code: 'allow',
    search_code_ast: 'allow',
    write_files: 'deny',
    run_command: 'deny',
  },
}

/**
 * Permission manager class
 */
export class PermissionManager {
  private pendingRequests: Map<Identifier, PermissionRequest> = new Map()
  private sessionPermissions: Map<Identifier, Permission> = new Map()
  private userDecisions: Map<string, PermissionDecision> = new Map()

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

    const decisionKey = `${tool}:${pattern}`

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
      const checkInterval = setInterval(() => {
        const req = this.pendingRequests.get(id)
        if (req?.decision) {
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
        }
      }, 100)

      setTimeout(() => {
        clearInterval(checkInterval)
        this.pendingRequests.delete(id)
        resolve({
          granted: false,
          decision: 'deny',
          reason: 'Timeout',
        })
      }, 60000)
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
   * Get pending requests
   */
  getPendingRequests(): PermissionRequest[] {
    return Array.from(this.pendingRequests.values())
  }
}

export const permissions = new PermissionManager()
