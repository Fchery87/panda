import type { Permission as LegacyPermission } from '../types'
import type { PermissionRule, Capability, Decision } from './types'

function resolveCapability(toolName: string): Capability {
  switch (toolName) {
    case 'read_files':
    case 'list_directory':
      return 'read'
    case 'search_codebase':
    case 'search_code':
    case 'search_code_ast':
      return 'search'
    case 'write_files':
    case 'apply_patch':
      return 'edit'
    case 'run_command':
      return 'exec'
    case 'update_memory_bank':
      return 'memory'
    case 'task':
      return 'plan_exit'
    case 'question':
      return 'read'
    default:
      return 'read'
  }
}

function parseLegacyKey(key: string): { toolName: string; pattern?: string } {
  const [toolName, ...patternParts] = key.split(':')
  const pattern = patternParts.length > 0 ? patternParts.join(':') : undefined
  return { toolName, pattern }
}

export function legacyPermissionsToRules(
  legacy: LegacyPermission,
  source: PermissionRule['source'] = 'session'
): PermissionRule[] {
  return (Object.entries(legacy) as Array<[string, Decision]>).map(([key, decision]) => {
    const { toolName, pattern } = parseLegacyKey(key)
    return {
      capability: resolveCapability(toolName),
      ...(pattern ? { pattern } : {}),
      decision,
      source,
    }
  })
}
