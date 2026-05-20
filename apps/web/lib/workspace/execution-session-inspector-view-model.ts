import type { RightPanelTabId } from '@/components/panels/RightPanel'
import type { ExecutionSessionViewModel } from './execution-session-view-model'

export interface ExecutionSessionInspectorViewModel {
  eyebrow: string
  title: string
  summary: string
  emptyTitle: string
  emptyDetail: string
}

export function buildExecutionSessionInspectorViewModel(
  tab: RightPanelTabId,
  session: ExecutionSessionViewModel | null
): ExecutionSessionInspectorViewModel {
  const sessionTitle = session?.title ?? 'Current session'
  const eyebrow = 'Execution Session Inspector'

  switch (tab) {
    case 'proof':
      return {
        eyebrow,
        title: 'Session Proof',
        summary: `${sessionTitle}: ${session?.proof.detail ?? 'Track progress, receipts, recovery, and validation evidence.'}`,
        emptyTitle: 'No run proof yet',
        emptyDetail: 'Proof appears after Panda executes work in this session.',
      }
    case 'changes':
      return {
        eyebrow,
        title: 'Session Changes',
        summary:
          session?.changedWork.label ?? 'Inspect artifacts and changed work before continuing.',
        emptyTitle: 'No changed work yet',
        emptyDetail: 'Artifacts and file changes appear here after this session edits files.',
      }
    case 'context':
      return {
        eyebrow,
        title: 'Session Context',
        summary:
          'Review the plan, project memory, and repeatable eval checks attached to this session.',
        emptyTitle: 'No session context yet',
        emptyDetail: 'Plans, specs, memory, and eval checks appear here as they are attached.',
      }
    case 'work':
    default:
      return {
        eyebrow,
        title: 'Session Work',
        summary: 'Open files, inspect diffs, and review implementation detail for this session.',
        emptyTitle: 'No work selected',
        emptyDetail: 'Open a file, diff, or generated artifact to inspect implementation detail.',
      }
  }
}
