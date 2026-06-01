export type LandingFeatureIconKey = 'bot' | 'fileCode' | 'terminal' | 'zap'

export interface LandingFeature {
  id: 'plan-review' | 'artifacts' | 'runs' | 'approvals'
  number: string
  title: string
  description: string
  iconKey: LandingFeatureIconKey
  size: 'small' | 'large'
}

export type EducationIconKey = 'explorer' | 'work' | 'chat' | 'inspector'

export interface EducationDetail {
  name: string
  role: string
  userValue: string
}

export interface EducationSurfaceSection {
  id: 'explorer' | 'work' | 'chat' | 'inspector'
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
    title: 'Reviewable Plans',
    description:
      'Move from request to execution with saved plans, explicit review gates, and acceptance checks you can inspect first.',
    iconKey: 'bot',
    size: 'small',
  },
  {
    id: 'artifacts',
    number: '02',
    title: 'Editor-Owned Files',
    description:
      'Open, edit, generate, and review files in the central Editor while chat stays focused on direction.',
    iconKey: 'fileCode',
    size: 'large',
  },
  {
    id: 'runs',
    number: '03',
    title: 'Recoverable Runs',
    description:
      'Run Agent in Guided or Autopilot mode with bounded receipts, command summaries, checkpoints, and recovery state.',
    iconKey: 'terminal',
    size: 'large',
  },
  {
    id: 'approvals',
    number: '04',
    title: 'Approvals, Receipts, and Delegation',
    description:
      'Approve risky actions in the browser, preserve project context, and delegate bounded subtasks to custom subagents.',
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
    summary: 'Find the files, symbols, and project context that should shape the next agent turn.',
    bullets: [
      'Project-aware file tree navigation',
      'Search when structure is not enough',
      'Selected files open in Editor and attach to chat context',
    ],
  },
  {
    id: 'work',
    label: '02',
    title: 'Editor',
    iconKey: 'work',
    summary:
      'Keep editing, Review Diff, terminal output, changed work, and the current objective in one canvas.',
    bullets: [
      'Tabbed editor and changed-work review',
      'Browser runtime with server fallback',
      'Terminal output and run evidence beside the task thread',
    ],
  },
  {
    id: 'chat',
    label: '03',
    title: 'Chat Panel',
    iconKey: 'chat',
    summary:
      'Direct Panda through Ask, Plan, and Agent without separating the conversation from the work.',
    bullets: [
      'Ask / Plan / Agent mode controls',
      'Guided / Autopilot autonomy for Agent runs',
      'Plan review, approvals, and run status in-thread',
    ],
  },
  {
    id: 'inspector',
    label: '04',
    title: 'Inspector Rail',
    iconKey: 'inspector',
    summary:
      'Inspect run evidence, plans, changed work, memory, delegated work, and recovery state without leaving the session.',
    bullets: [
      'Run events, receipts, and checkpoints',
      'Plans, changes, memory, delegated work, and recovery state',
    ],
  },
]

export const explorerDetails: EducationDetail[] = [
  {
    name: 'FileTree',
    role: 'Primary map for project folders and files.',
    userValue: 'Open the exact code the agent should understand before you ask for work.',
  },
  {
    name: 'ProjectSearchPanel',
    role: 'Project-wide search beside the file tree.',
    userValue: 'Jump to the right file when you know the concept but not the path.',
  },
  {
    name: 'Selection wiring',
    role: 'Selected files flow into editor state and chat context.',
    userValue: 'Keep the next answer grounded in the files that matter.',
  },
]

export const workspaceDetails: EducationDetail[] = [
  {
    name: 'FileTabs',
    role: 'Tracks open files, active file state, and unsaved work.',
    userValue: 'Move across a change set without losing your place.',
  },
  {
    name: 'EditorContainer',
    role: 'Main code editing surface for selected project files.',
    userValue: 'Read, edit, and save code where the agent context already lives.',
  },
  {
    name: 'Timeline',
    role: 'Change, run, and evidence context tied to the active work thread.',
    userValue: 'Understand what changed, why it changed, and what still needs review.',
  },
  {
    name: 'Terminal',
    role: 'Integrated command panel for the current project runtime.',
    userValue:
      'Run installs, tests, and scripts in browser when possible, with fallback when needed.',
  },
]

export const chatDetails: EducationDetail[] = [
  {
    name: 'MessageList',
    role: 'Shows the active transcript and streaming assistant output.',
    userValue: 'Keep direction, decisions, and results attached to the same work thread.',
  },
  {
    name: 'ChatInput',
    role: 'Prompt composer with Ask / Plan / Agent mode controls, Agent autonomy, model selection, depth, and `@` file controls.',
    userValue:
      'Choose Ask, Plan, or Agent; then select Guided or Autopilot when implementation work should run.',
  },
  {
    name: 'Plan Review Card',
    role: 'Inline plan state tied to approval and Agent execution.',
    userValue:
      'Review the execution contract before Panda starts changing files or running commands.',
  },
  {
    name: 'Permission Requests',
    role: 'Browser-native approval UI for risky command execution and other gated actions.',
    userValue:
      'Approve sensitive actions at the moment they matter instead of trusting a hidden run.',
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
    name: 'Run Evidence',
    role: 'Shows persisted run progress, event summaries, receipts, approvals, and recovery signals.',
    userValue: 'Inspect what happened, what passed, and where a paused run can resume.',
  },
  {
    name: 'Context Tab',
    role: 'Plan, project memory, selected files, and handoff context tied to the active chat.',
    userValue: 'Review the durable context Panda will use before it continues work.',
  },
  {
    name: 'Changes Tab',
    role: 'Changed-work review surface for generated artifacts and diff inspection.',
    userValue: 'Inspect the current work before continuing or sharing results.',
  },
  {
    name: 'Receipts + Checkpoints',
    role: 'Bounded execution evidence and recovery state for Agent runs.',
    userValue: 'See what happened, what was approved, and where work can resume.',
  },
]

export const workflowSteps: EducationWorkflowStep[] = [
  {
    id: 'pick-context',
    title: 'Orient the project context',
    description:
      'Use the file tree, search, and file mentions to put the relevant code in front of Panda before the request starts.',
  },
  {
    id: 'edit-and-inspect',
    title: 'Choose the right mode',
    description:
      'Use Ask for explanation, Plan for a reviewable strategy, and Agent for implementation. Agent can run as Guided or Autopilot depending on the review boundary you want.',
  },
  {
    id: 'ask-panda',
    title: 'Review the execution contract',
    description:
      'For structured work, Panda saves a plan artifact so you can inspect scope, constraints, and acceptance checks before Agent execution starts.',
  },
  {
    id: 'review-and-approve',
    title: 'Approve gated work',
    description:
      'Plans, risky commands, and sensitive actions pause for review. You decide when Panda can write, install, delete, or execute.',
  },
  {
    id: 'inspect-or-resume',
    title: 'Watch run evidence as it runs',
    description:
      'Run events, changed work, command output, receipts, and checkpoints stay attached to the active session for inspection.',
  },
  {
    id: 'share-verify-repeat',
    title: 'Verify, share, or resume',
    description:
      'Review the diff, inspect receipts, run checks, share the redacted work thread, or resume from a checkpoint after interruption.',
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
