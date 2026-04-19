export const flags = {
  get unifiedPermissions(): boolean {
    return process.env.PANDA_UNIFIED_PERMISSIONS !== '0'
  },
  get phasePermissions(): boolean {
    return process.env.PANDA_PHASE_PERMISSIONS !== '0'
  },
  get specEnforcement(): boolean {
    return process.env.PANDA_SPEC_ENFORCEMENT === '1'
  },
  get checkpointFullState(): boolean {
    return process.env.PANDA_CHECKPOINT_FULL_STATE !== '0'
  },
  get specLifecycleManager(): boolean {
    return process.env.PANDA_SPEC_LIFECYCLE_MANAGER === '1'
  },
} as const
