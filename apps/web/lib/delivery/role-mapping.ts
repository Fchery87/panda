import type { ChatMode } from '@/lib/agent/prompt-library'
import type { DeliveryRole } from './types'

export function mapChatModeToDeliveryRole(mode: ChatMode): DeliveryRole {
  if (mode === 'build' || mode === 'code') return 'builder'
  if (mode === 'architect') return 'executive'
  return 'manager'
}
