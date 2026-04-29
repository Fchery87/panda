export type RuntimeProviderStatus = 'idle' | 'booting' | 'ready' | 'error' | 'unsupported'

export type RuntimeAvailabilityPhase = RuntimeProviderStatus

export interface RuntimeAvailability {
  phase: RuntimeAvailabilityPhase
  label: 'Idle' | 'Booting' | 'Ready' | 'Fallback' | 'Server'
  detail?: string
  canUseBrowserRuntime: boolean
  canUseServerFallback: boolean
  providerStatus: RuntimeProviderStatus
}

export function resolveRuntimeAvailability(args: {
  status: RuntimeProviderStatus
  error?: string | null
}): RuntimeAvailability {
  switch (args.status) {
    case 'booting':
      return {
        phase: 'booting',
        label: 'Booting',
        canUseBrowserRuntime: false,
        canUseServerFallback: true,
        providerStatus: args.status,
      }
    case 'ready':
      return {
        phase: 'ready',
        label: 'Ready',
        canUseBrowserRuntime: true,
        canUseServerFallback: true,
        providerStatus: args.status,
      }
    case 'error':
      return {
        phase: 'error',
        label: 'Fallback',
        ...(args.error ? { detail: args.error } : {}),
        canUseBrowserRuntime: false,
        canUseServerFallback: true,
        providerStatus: args.status,
      }
    case 'unsupported':
      return {
        phase: 'unsupported',
        label: 'Server',
        canUseBrowserRuntime: false,
        canUseServerFallback: true,
        providerStatus: args.status,
      }
    case 'idle':
      return {
        phase: 'idle',
        label: 'Idle',
        canUseBrowserRuntime: false,
        canUseServerFallback: true,
        providerStatus: args.status,
      }
  }
}
