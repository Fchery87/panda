import { findCapability } from '../providers/model-capabilities'
import { CHAT_MODE_CONFIGS } from '../chat-modes'
import type { ChatMode } from '../chat-modes'

export interface PreflightOptions {
  providerId: string
  modelId: string
  chatMode: ChatMode
  hasApprovedPlan: boolean
  allowExperimental?: boolean
}

export type PreflightResult = { ok: true } | { ok: false; error: { code: string; message: string } }

export function runPreflight(opts: PreflightOptions): PreflightResult {
  const modeConfig = CHAT_MODE_CONFIGS[opts.chatMode]

  // Check tool-calling capability for any mode that requires tool calls.
  // If no model is resolved yet, defer manifest enforcement to later runtime
  // stages instead of failing early on an empty identifier.
  if (modeConfig.requiresToolCalls && opts.modelId) {
    const cap = findCapability(opts.providerId, opts.modelId)

    if (!cap) {
      return {
        ok: false,
        error: {
          code: 'UNMANIFESTED_MODEL',
          message: `Model "${opts.modelId}" from provider "${opts.providerId}" has no capability manifest entry. Add it to apps/web/lib/agent/providers/model-capabilities.ts before using ${modeConfig.surface.label} mode.`,
        },
      }
    }

    if (cap.status === 'unverified' || (cap.status === 'experimental' && !opts.allowExperimental)) {
      return {
        ok: false,
        error: {
          code: 'UNVERIFIED_MODEL',
          message: `Model "${opts.modelId}" (status: ${cap.status}) is not verified for ${modeConfig.surface.label} mode. Enable experimental models or switch to a verified model.`,
        },
      }
    }
  }

  return { ok: true }
}
