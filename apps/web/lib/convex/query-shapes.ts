import type { Id } from '@convex/_generated/dataModel'

const PROJECT_BOOT_CHAT_LIMIT = 25

export type ConvexQueryShape = 'summary' | 'detail'

export interface ConvexQueryShapeDescriptor {
  shape: ConvexQueryShape
  payload: string
}

export const PROJECT_BOOT_QUERY_SHAPES = {
  files: {
    shape: 'summary',
    payload: 'metadata',
  },
  chats: {
    shape: 'summary',
    payload: 'recent',
  },
} as const satisfies Record<string, ConvexQueryShapeDescriptor>

export function getProjectBootQueryArgs(projectId: Id<'projects'>) {
  return {
    files: { projectId },
    chats: { projectId, limit: PROJECT_BOOT_CHAT_LIMIT },
  }
}
