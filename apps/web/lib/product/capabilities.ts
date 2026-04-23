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
    title: 'Review Before Execution',
    description:
      'Move from request to approved execution with saved plans, explicit review gates, and a build contract you can inspect first.',
    iconKey: 'bot',
    size: 'small',
  },
  {
    id: 'artifacts',
    number: '02',
    title: 'One Operational Workspace',
    description:
      'Edit files, inspect diffs, review generated artifacts, and keep the current objective in view without leaving the browser.',
    iconKey: 'fileCode',
    size: 'large',
  },
  {
    id: 'runs',
    number: '03',
    title: 'Runs You Can Recover',
    description:
      'Track run progress, inspect history, recover paused execution from checkpoints, and continue without losing context.',
    iconKey: 'terminal',
    size: 'large',
  },
  {
    id: 'approvals',
    number: '04',
    title: 'Approvals, Memory, and Sharing',
    description:
      'Review risky actions in the browser, keep persistent project context close at hand, and share the active work thread when needed.',
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
    summary:
      'Edit files, inspect changed work, and keep the current objective visible in one operational canvas.',
    bullets: [
      'Tabbed editor + diff review',
      'Integrated terminal + preview',
      'Responsive workbench shell',
    ],
  },
  {
    id: 'chat',
    label: '03',
    title: 'Chat Panel',
    iconKey: 'chat',
    summary:
      'Direct the agent, move between planning and execution, and keep the active thread close to the work itself.',
    bullets: [
      'Message history + streaming input',
      'Mode, model, and file-context controls',
      'Planning, approval, and build actions',
    ],
  },
  {
    id: 'inspector',
    label: '04',
    title: 'Operational Rail',
    iconKey: 'inspector',
    summary:
      'Review run history, plan state, changed work, memory, and eval checks without leaving the active project session.',
    bullets: ['Run and recovery', 'Plan and changed-work review', 'Memory and eval checks'],
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
    role: 'Change and run context tied to the active work thread.',
    userValue: 'Understand what changed and when without switching into a different tool.',
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
    role: 'Inline plan state entry point tied to the rail and execution actions.',
    userValue:
      'Move from planning to execution without losing the active thread or project context.',
  },
  {
    name: 'Permission Requests',
    role: 'Browser-native approval UI for risky command execution and other gated actions.',
    userValue: 'Teach Panda how your project works so future runs stay aligned.',
  },
  {
    name: 'Share + History Actions',
    role: 'Chat actions that route into history, review, and sharing from the current thread.',
    userValue:
      'Inspect past execution and share the active work thread without leaving the project.',
  },
]

export const specDetails: EducationDetail[] = [
  {
    name: 'Run Tab',
    role: 'Shows persisted run history, execution progress, and recovery signals.',
    userValue: 'Use it to inspect what happened, not just what the agent said.',
  },
  {
    name: 'Plan Tab',
    role: 'Editable plan surface with review, approval, and build-from-plan controls.',
    userValue: 'This is where planning turns into an execution contract.',
  },
  {
    name: 'Changes Tab',
    role: 'Changed-work review surface for generated artifacts and diff inspection.',
    userValue: 'Inspect the current work before continuing or sharing results.',
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
      'For structured work, review the saved plan in the operational rail and approve it before build execution starts.',
  },
  {
    id: 'inspect-or-resume',
    title: 'Inspect or resume the run',
    description:
      'Use the operational rail to inspect Run, Plan, Changes, Memory, and Evals. Recover a paused run when Panda surfaces a resumable checkpoint.',
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
