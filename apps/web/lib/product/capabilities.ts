export type LandingFeatureIconKey = 'bot' | 'fileCode' | 'terminal' | 'zap'

export interface LandingFeature {
  id: 'plan-review' | 'artifacts' | 'runs' | 'approvals'
  number: string
  title: string
  description: string
  iconKey: LandingFeatureIconKey
  size: 'small' | 'large'
}

export type EducationIconKey = 'explorer' | 'workspace' | 'chat' | 'inspector'

export interface EducationDetail {
  name: string
  role: string
  userValue: string
}

export interface EducationSurfaceSection {
  id: 'explorer' | 'workspace' | 'chat' | 'inspector'
  label: string
  title: string
  iconKey: EducationIconKey
  summary: string
  bullets: string[]
  details?: EducationDetail[]
}

export interface EducationWorkflowSection {
  id: 'workflow'
  title: string
  steps: Array<{ id: string; title: string; description: string }>
}

export type EducationSection = EducationSurfaceSection | EducationWorkflowSection

export interface EducationWorkflowStep {
  id: string
  title: string
  description: string
}

export const landingFeatures: LandingFeature[] = [
  {
    id: 'plan-review',
    number: '01',
    title: 'Plan Review Before Execution',
    description:
      'Move from architecting to building with saved plans, explicit approval gates, and build-from-plan execution.',
    iconKey: 'bot',
    size: 'small',
  },
  {
    id: 'artifacts',
    number: '02',
    title: 'Files, Diffs, and Artifacts',
    description:
      'Open files, edit in place, review generated artifacts, and apply updates from the same browser workspace.',
    iconKey: 'fileCode',
    size: 'large',
  },
  {
    id: 'runs',
    number: '03',
    title: 'Runs You Can Resume',
    description:
      'Track run progress, inspect history, recover paused execution from checkpoints, and keep work moving.',
    iconKey: 'terminal',
    size: 'large',
  },
  {
    id: 'approvals',
    number: '04',
    title: 'Browser-Native Approvals and Sharing',
    description:
      'Review risky commands in the browser, keep project state synced live, and share the active chat with one link.',
    iconKey: 'zap',
    size: 'small',
  },
]

export const interfaceMap: EducationSurfaceSection[] = [
  {
    id: 'explorer',
    label: '01',
    title: 'Explorer',
    iconKey: 'explorer',
    summary:
      'Browse files, search the project, and choose the exact code context you want to work on.',
    bullets: [
      'File tree navigation',
      'Project search panel',
      'Fast file selection for editor + chat',
    ],
  },
  {
    id: 'workspace',
    label: '02',
    title: 'Workspace',
    iconKey: 'workspace',
    summary: 'Edit files, inspect timeline context, and run terminal commands in one place.',
    bullets: ['Tabbed editor + timeline', 'Integrated terminal', 'Responsive workbench layout'],
  },
  {
    id: 'chat',
    label: '03',
    title: 'Chat Panel',
    iconKey: 'chat',
    summary:
      'Talk to the agent, move between planning and build flows, and keep the active run visible while you work.',
    bullets: [
      'Message history + streaming input',
      'Mode, model, and file-context controls',
      'Plan review and build actions',
    ],
  },
  {
    id: 'inspector',
    label: '04',
    title: 'Inspector',
    iconKey: 'inspector',
    summary:
      'Inspect run history, plan state, memory, and eval surfaces without leaving the project session.',
    bullets: ['Run timeline and history', 'Plan panel with approval state', 'Memory and eval tabs'],
  },
]

export const explorerDetails: EducationDetail[] = [
  {
    name: 'FileTree',
    role: 'Primary explorer for browsing folders and files.',
    userValue: 'Select, create, rename, or delete files and send them into the editor quickly.',
  },
  {
    name: 'ProjectSearchPanel',
    role: 'Project-wide search panel living beside the explorer tab.',
    userValue: 'Jump to the right file faster when you know what you need but not where it lives.',
  },
  {
    name: 'Selection wiring',
    role: 'File selection flows into `selectedFilePath` and can include line/column targets.',
    userValue: 'Clicking from search or AI results can open the right file at the right location.',
  },
]

export const workspaceDetails: EducationDetail[] = [
  {
    name: 'FileTabs',
    role: 'Tracks open files and tab state, including dirty status.',
    userValue: 'Work across multiple files without losing place.',
  },
  {
    name: 'EditorContainer',
    role: 'Main code editing surface for the selected file.',
    userValue: 'Write and save code directly in the workbench instead of switching tools.',
  },
  {
    name: 'Timeline',
    role: 'Chat-linked timeline view (`Timeline chatId={currentChatId}`).',
    userValue: 'Understand what changed and when in the context of the active conversation.',
  },
  {
    name: 'Terminal',
    role: 'Integrated command execution panel tied to the current project.',
    userValue: 'Run installs, tests, and scripts without leaving Panda.',
  },
]

export const chatDetails: EducationDetail[] = [
  {
    name: 'MessageList',
    role: 'Shows the conversation history and streaming assistant output.',
    userValue: 'Keeps the full reasoning and action context visible while you work.',
  },
  {
    name: 'ChatInput',
    role: 'Prompt composer with mode selection, model controls, reasoning variant, and `@` file mentions.',
    userValue: 'You can direct the agent precisely and attach project context inline.',
  },
  {
    name: 'Plan Review Card',
    role: 'Inline review surface for approved, awaiting-review, and executing plan states.',
    userValue: 'Move from planning to execution without losing the active chat context.',
  },
  {
    name: 'Permission Requests',
    role: 'Browser-native approval UI for risky command execution and other gated actions.',
    userValue: 'Teach Panda how your project works so future runs stay aligned.',
  },
  {
    name: 'Share + History Actions',
    role: 'Chat actions that open the share dialog and run-history inspector.',
    userValue: 'Review past execution and share the active chat without leaving the project.',
  },
]

export const specDetails: EducationDetail[] = [
  {
    name: 'Run Tab',
    role: 'Shows persisted run history and current execution progress.',
    userValue: 'Use it to inspect what happened, not just what the agent said.',
  },
  {
    name: 'Plan Tab',
    role: 'Editable plan surface with review, approval, and build-from-plan controls.',
    userValue: 'This is where planning turns into an execution contract.',
  },
  {
    name: 'Memory Tab',
    role: 'Persistent project context the agent can reuse across future runs.',
    userValue: 'Keep repeated instructions out of every prompt.',
  },
  {
    name: 'Evals Tab',
    role: 'Evaluation surface for checking response quality and scenario behavior.',
    userValue: 'Use it to validate how Panda behaves on repeated workflows.',
  },
]

export const workflowSteps: EducationWorkflowStep[] = [
  {
    id: 'pick-context',
    title: 'Pick context in Explorer',
    description:
      'Use the file tree or search panel to choose the files you want to inspect. This sets up the workspace and gives you precise context to mention in chat.',
  },
  {
    id: 'edit-and-inspect',
    title: 'Edit and inspect in Workspace',
    description:
      'Open multiple files as tabs, edit code, inspect the timeline, and run terminal commands while staying in the same project session.',
  },
  {
    id: 'ask-panda',
    title: 'Ask Panda to plan, ask, or build',
    description:
      'Use the chat input mode selector and send a request with file mentions, model controls, and the right browser context.',
  },
  {
    id: 'review-and-approve',
    title: 'Review and approve the plan',
    description:
      'For structured work, review the saved plan in the inspector and approve it before build execution starts.',
  },
  {
    id: 'inspect-or-resume',
    title: 'Inspect or resume the run',
    description:
      'Open the inspector to view Run, Plan, Memory, and Evals. Recover a paused run when Panda surfaces a resumable checkpoint.',
  },
  {
    id: 'share-verify-repeat',
    title: 'Share, verify, repeat',
    description:
      'Review changes in the workspace, verify the results, and share the active chat or revisit run history when needed.',
  },
]

export const educationSections: EducationSection[] = [
  ...interfaceMap,
  {
    id: 'workflow',
    title: 'Workflow',
    steps: workflowSteps,
  },
]
