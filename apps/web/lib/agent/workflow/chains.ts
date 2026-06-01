import type { ChatMode } from '../prompt-library'
import type { WorkflowArtifactKind } from './artifacts'
import type { WorkflowStage } from './stages'

export type WorkflowChainId =
  | 'research-to-plan'
  | 'full-feature-build'
  | 'bug-investigation'
  | 'review-driven-revision'
  | 'session-handoff'
  | 'deep-branch-review'

export interface WorkflowChainStep {
  id: string
  stage: WorkflowStage
  mode: ChatMode
  label: string
  description: string
  artifactKind?: WorkflowArtifactKind
  requiresApproval?: boolean
  reviewLane?: 'security' | 'correctness' | 'quality'
  subagentType?: string
  isolationMode?: 'snapshot' | 'worktree' | 'patch-proposal' | 'shared-readonly'
  parallelGroup?: string
}

export interface WorkflowChainTemplate {
  id: WorkflowChainId
  label: string
  description: string
  steps: WorkflowChainStep[]
}

export const WORKFLOW_CHAIN_TEMPLATES: WorkflowChainTemplate[] = [
  {
    id: 'research-to-plan',
    label: 'Research to Plan',
    description: 'Gather context, design the approach, and produce an implementation-ready plan.',
    steps: [
      {
        id: 'research',
        stage: 'research',
        mode: 'ask',
        label: 'Research',
        description: 'Find the relevant codebase surfaces and patterns.',
        artifactKind: 'research',
      },
      {
        id: 'design',
        stage: 'design',
        mode: 'plan',
        label: 'Design',
        description: 'Define integration boundaries and trade-offs.',
        artifactKind: 'design',
      },
      {
        id: 'plan',
        stage: 'plan',
        mode: 'plan',
        label: 'Plan',
        description: 'Create a reviewable implementation plan.',
        artifactKind: 'implementation_plan',
        requiresApproval: true,
      },
    ],
  },
  {
    id: 'full-feature-build',
    label: 'Full Feature Build',
    description: 'Clarify, research, design, plan, implement, validate, and review a feature.',
    steps: [
      {
        id: 'clarify',
        stage: 'clarify',
        mode: 'ask',
        label: 'Clarify',
        description: 'Resolve requirements and decisions.',
        artifactKind: 'requirements',
      },
      {
        id: 'research',
        stage: 'research',
        mode: 'ask',
        label: 'Research',
        description: 'Gather codebase context.',
        artifactKind: 'research',
      },
      {
        id: 'design',
        stage: 'design',
        mode: 'plan',
        label: 'Design',
        description: 'Define architecture.',
        artifactKind: 'design',
      },
      {
        id: 'plan',
        stage: 'plan',
        mode: 'plan',
        label: 'Plan',
        description: 'Approve implementation plan.',
        artifactKind: 'implementation_plan',
        requiresApproval: true,
      },
      {
        id: 'implement',
        stage: 'implement',
        mode: 'code',
        label: 'Implement',
        description: 'Apply focused changes.',
      },
      {
        id: 'validate',
        stage: 'validate',
        mode: 'code',
        label: 'Validate',
        description: 'Run checks and collect evidence.',
        artifactKind: 'validation_report',
      },
      {
        id: 'review',
        stage: 'review',
        mode: 'code',
        label: 'Review',
        description: 'Audit diff and risks.',
        artifactKind: 'review_report',
        requiresApproval: true,
      },
    ],
  },
  {
    id: 'bug-investigation',
    label: 'Bug Investigation',
    description: 'Clarify symptoms, research likely causes, reproduce/validate, then plan or fix.',
    steps: [
      {
        id: 'clarify',
        stage: 'clarify',
        mode: 'ask',
        label: 'Clarify',
        description: 'Capture expected vs actual behavior.',
        artifactKind: 'requirements',
      },
      {
        id: 'research',
        stage: 'research',
        mode: 'ask',
        label: 'Research',
        description: 'Locate likely failing surfaces.',
        artifactKind: 'research',
      },
      {
        id: 'validate',
        stage: 'validate',
        mode: 'code',
        label: 'Reproduce',
        description: 'Run targeted checks to reproduce or disprove.',
        artifactKind: 'validation_report',
      },
    ],
  },
  {
    id: 'review-driven-revision',
    label: 'Review-Driven Revision',
    description: 'Use review findings to revise the plan and continue implementation.',
    steps: [
      {
        id: 'review',
        stage: 'review',
        mode: 'code',
        label: 'Review',
        description: 'Audit current diff.',
        artifactKind: 'review_report',
      },
      {
        id: 'plan',
        stage: 'plan',
        mode: 'plan',
        label: 'Revise Plan',
        description: 'Adjust the plan around findings.',
        artifactKind: 'implementation_plan',
        requiresApproval: true,
      },
      {
        id: 'implement',
        stage: 'implement',
        mode: 'code',
        label: 'Continue',
        description: 'Apply the revised plan.',
      },
      {
        id: 'validate',
        stage: 'validate',
        mode: 'code',
        label: 'Validate',
        description: 'Verify the revised result.',
        artifactKind: 'validation_report',
      },
    ],
  },
  {
    id: 'deep-branch-review',
    label: 'Deep Branch Review',
    description:
      'Fan out security, correctness, and quality review lanes as compact advisor findings.',
    steps: [
      {
        id: 'security-review',
        stage: 'review',
        mode: 'code',
        label: 'Security Review',
        description:
          'Audit auth, secret handling, network boundaries, and destructive-operation risk. Emit compact advisor findings only.',
        artifactKind: 'review_report',
        reviewLane: 'security',
        subagentType: 'advisor-reviewer',
        isolationMode: 'snapshot',
        parallelGroup: 'deep-review',
      },
      {
        id: 'correctness-review',
        stage: 'review',
        mode: 'code',
        label: 'Correctness Review',
        description:
          'Audit behavior, edge cases, tests, and integration assumptions. Emit compact advisor findings only.',
        artifactKind: 'review_report',
        reviewLane: 'correctness',
        subagentType: 'advisor-reviewer',
        isolationMode: 'snapshot',
        parallelGroup: 'deep-review',
      },
      {
        id: 'quality-review',
        stage: 'review',
        mode: 'code',
        label: 'Quality Review',
        description:
          'Audit maintainability, architecture drift, payload size, and cleanup risk. Emit compact advisor findings only.',
        artifactKind: 'review_report',
        reviewLane: 'quality',
        subagentType: 'advisor-reviewer',
        isolationMode: 'snapshot',
        parallelGroup: 'deep-review',
      },
    ],
  },
  {
    id: 'session-handoff',
    label: 'Session Handoff',
    description: 'Summarize current state for a future session.',
    steps: [
      {
        id: 'review',
        stage: 'review',
        mode: 'ask',
        label: 'Collect State',
        description: 'Summarize current decisions, files, and risks.',
        artifactKind: 'review_report',
      },
      {
        id: 'handoff',
        stage: 'handoff',
        mode: 'build',
        label: 'Handoff',
        description: 'Create a compact continuation artifact.',
        artifactKind: 'handoff',
      },
    ],
  },
]

export function getWorkflowChainTemplate(id: WorkflowChainId): WorkflowChainTemplate | undefined {
  return WORKFLOW_CHAIN_TEMPLATES.find((template) => template.id === id)
}

export function getNextWorkflowChainStep(args: {
  chainId: WorkflowChainId
  completedStepIds: string[]
}): WorkflowChainStep | null {
  const template = getWorkflowChainTemplate(args.chainId)
  if (!template) return null
  const completed = new Set(args.completedStepIds)
  return template.steps.find((step) => !completed.has(step.id)) ?? null
}

export function buildWorkflowChainPrompt(args: {
  chainId: WorkflowChainId
  stepId: string
  userGoal: string
}): string {
  const template = getWorkflowChainTemplate(args.chainId)
  const step = template?.steps.find((candidate) => candidate.id === args.stepId)
  if (!template || !step) return args.userGoal
  return `Workflow: ${template.label}\nCurrent step: ${step.label} (${step.stage})\nGoal: ${args.userGoal}\n\n${step.description}`
}
