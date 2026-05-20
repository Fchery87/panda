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
    summary: 'Find the files, symbols, and project context that should shape the next agent turn.',
    bullets: [
      'Project-aware file tree navigation',
      'Search when structure is not enough',
      'Selected files route into editor and chat context',
    ],
  },
  {
    id: 'work',
    label: '02',
    title: 'Work',
    iconKey: 'work',
    summary:
      'Keep editing, diffs, terminal output, preview state, and the current objective in one canvas.',
    bullets: [
      'Tabbed editor and changed-work review',
      'Browser runtime with server fallback',
      'Terminal and preview beside the task thread',
    ],
  },
  {
    id: 'chat',
    label: '03',
    title: 'Chat Panel',
    iconKey: 'chat',
    summary:
      'Direct Panda through ask, plan, code, and build without separating the conversation from the work.',
    bullets: [
      'Canonical mode, model, and context controls',
      'Plan review and build handoff in-thread',
      'Permission gates before risky actions',
    ],
  },
  {
    id: 'inspector',
    label: '04',
    title: 'Operational Rail',
    iconKey: 'inspector',
    summary:
      'Inspect proof, plans, changed work, memory, and recovery state without leaving the session.',
    bullets: [
      'Run events, receipts, and checkpoints',
      'Plans, changes, memory, evals, and preview',
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
    role: 'Change, run, and proof context tied to the active work thread.',
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
    role: 'Prompt composer with mode, model, depth, and `@` file controls.',
    userValue: 'Choose ask, plan, code, or build and attach the project context inline.',
  },
  {
    name: 'Plan Review Card',
    role: 'Inline plan state tied to approval and build execution.',
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
    name: 'Run Tab',
    role: 'Shows persisted run progress, event summaries, receipts, and recovery signals.',
    userValue: 'Inspect what happened, what passed, and where a paused run can resume.',
  },
  {
    name: 'Context Tab',
    role: 'Plan, project memory, spec, and eval surface tied to the active chat.',
    userValue: 'Review the durable context Panda will use before it continues work.',
  },
  {
    name: 'Changes Tab',
    role: 'Changed-work review surface for generated artifacts and diff inspection.',
    userValue: 'Inspect the current work before continuing or sharing results.',
  },
  {
    name: 'Preview Tab',
    role: 'Runtime output surface for browser or app previews.',
    userValue: 'Check the result next to the plan, diff, and conversation that produced it.',
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
      'Use ask for explanation, plan for reviewable strategy, code for focused edits, and build for larger approved execution.',
  },
  {
    id: 'ask-panda',
    title: 'Review the execution contract',
    description:
      'For structured work, Panda saves a plan artifact so you can inspect scope, constraints, and acceptance checks before build starts.',
  },
  {
    id: 'review-and-approve',
    title: 'Approve gated work',
    description:
      'Plans, risky commands, and sensitive actions pause for review. You decide when Panda can write, install, delete, or execute.',
  },
  {
    id: 'inspect-or-resume',
    title: 'Watch proof as it runs',
    description:
      'Run events, changed work, command output, receipts, and checkpoints stay attached to the active session for inspection.',
  },
  {
    id: 'share-verify-repeat',
    title: 'Verify, share, or resume',
    description:
      'Review the diff and preview, run checks, share the redacted work thread, or resume from a checkpoint after interruption.',
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
