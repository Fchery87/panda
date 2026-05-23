import type { Capability } from '../harness/permission/types'
import type { Permission } from '../harness/types'
import type { SubagentCapabilityPreset } from './types'

export const SUBAGENT_CAPABILITY_PRESETS: SubagentCapabilityPreset[] = [
  'research',
  'assistant',
  'builder',
  'restricted',
]

export function normalizeSubagentName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function capabilitiesForPreset(preset: SubagentCapabilityPreset): Capability[] {
  switch (preset) {
    case 'research':
      return ['read', 'search']
    case 'assistant':
      return ['read', 'search']
    case 'builder':
      return ['read', 'search', 'edit', 'exec']
    case 'restricted':
      return ['read']
  }
}

export function permissionForPreset(preset: SubagentCapabilityPreset): Permission {
  switch (preset) {
    case 'research':
      return {
        read_files: 'allow',
        list_directory: 'allow',
        search_codebase: 'allow',
        search_code: 'allow',
        search_code_ast: 'allow',
        write_files: 'deny',
        apply_patch: 'deny',
        run_command: 'deny',
        update_memory_bank: 'deny',
        task: 'deny',
        question: 'deny',
      }
    case 'assistant':
      return {
        read_files: 'allow',
        list_directory: 'allow',
        search_codebase: 'allow',
        search_code: 'allow',
        search_code_ast: 'allow',
        write_files: 'ask',
        apply_patch: 'ask',
        run_command: 'ask',
        update_memory_bank: 'ask',
        task: 'deny',
        question: 'ask',
      }
    case 'builder':
      return {
        read_files: 'allow',
        list_directory: 'allow',
        search_codebase: 'allow',
        search_code: 'allow',
        search_code_ast: 'allow',
        write_files: 'allow',
        apply_patch: 'allow',
        run_command: 'allow',
        update_memory_bank: 'allow',
        task: 'deny',
        question: 'ask',
      }
    case 'restricted':
      return {
        read_files: 'allow',
        list_directory: 'deny',
        search_codebase: 'deny',
        search_code: 'deny',
        search_code_ast: 'deny',
        write_files: 'deny',
        apply_patch: 'deny',
        run_command: 'deny',
        update_memory_bank: 'deny',
        task: 'deny',
        question: 'deny',
      }
  }
}

export function isMutatingPermissionSet(permission: Permission): boolean {
  return ['write_files', 'apply_patch', 'run_command', 'update_memory_bank'].some(
    (tool) => permission[tool] === 'allow' || permission[tool] === 'ask'
  )
}
