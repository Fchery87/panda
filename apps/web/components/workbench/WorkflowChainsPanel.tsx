'use client'

import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { ChatMode } from '@/lib/agent/prompt-library'
import {
  WORKFLOW_CHAIN_TEMPLATES,
  buildWorkflowChainPrompt,
  type WorkflowChainId,
  type WorkflowChainTemplate,
} from '@/lib/agent/workflow'
import { Button } from '@/components/ui/button'

const DEFAULT_USER_GOAL = 'Continue the current Panda task'

type WorkflowChainAction = (
  prompt: string,
  targetMode?: ChatMode,
  metadata?: { workflowChainId: Id<'workflowChains'>; workflowChainStepId: string }
) => void

type PersistedWorkflowChain = {
  _id: string
  chainId: string
  label: string
  userGoal: string
  status: string
  currentStepId?: string
  steps: Array<{ id: string; label: string; stage: string; mode: string; status: string }>
}

function templateToPersistedSteps(template: WorkflowChainTemplate) {
  return template.steps.map((step) => ({
    id: step.id,
    stage: step.stage,
    mode: step.mode,
    label: step.label,
    status: 'pending' as const,
  }))
}

export function WorkflowChainsList({
  userGoal = DEFAULT_USER_GOAL,
  onStartChain,
  onPersistChain,
}: {
  userGoal?: string
  onStartChain?: WorkflowChainAction
  onPersistChain?: (
    template: WorkflowChainTemplate,
    userGoal: string
  ) => Promise<Id<'workflowChains'> | unknown> | Id<'workflowChains'> | unknown
}) {
  return (
    <div className="space-y-2">
      {WORKFLOW_CHAIN_TEMPLATES.map((chain) => {
        const firstStep = chain.steps[0]
        const prompt = firstStep
          ? buildWorkflowChainPrompt({
              chainId: chain.id as WorkflowChainId,
              stepId: firstStep.id,
              userGoal,
            })
          : userGoal
        return (
          <article key={chain.id} className="bg-background/80 border border-border p-3 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-foreground">{chain.label}</h4>
                <p className="mt-1 text-muted-foreground">{chain.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {chain.steps.map((step) => (
                    <span
                      key={step.id}
                      className="bg-muted/40 border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground"
                    >
                      {step.label}
                    </span>
                  ))}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!firstStep || !onStartChain}
                onClick={async () => {
                  if (!firstStep) return
                  const persistedId = await onPersistChain?.(chain, userGoal)
                  onStartChain?.(
                    prompt,
                    firstStep.mode,
                    typeof persistedId === 'string'
                      ? {
                          workflowChainId: persistedId as Id<'workflowChains'>,
                          workflowChainStepId: firstStep.id,
                        }
                      : undefined
                  )
                }}
                className="h-7 shrink-0 rounded-none px-2 font-mono text-[10px] uppercase tracking-wide"
              >
                Start
              </Button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function ActiveWorkflowChains({ chains }: { chains: PersistedWorkflowChain[] }) {
  const activeChains = chains.filter(
    (chain) => chain.status === 'running' || chain.status === 'paused'
  )
  if (activeChains.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        Active chains
      </div>
      {activeChains.map((chain) => (
        <div key={chain._id} className="border-primary/20 bg-primary/5 border p-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-foreground">{chain.label}</span>
            <span className="font-mono text-[10px] uppercase tracking-wide text-primary">
              {chain.status}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {chain.steps.map((step) => (
              <span
                key={step.id}
                className="bg-background/80 border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground"
              >
                {step.label} · {step.status}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function WorkflowChainsPanel({
  projectId,
  chatId,
  userGoal,
  onStartChain,
}: {
  projectId?: Id<'projects'>
  chatId?: Id<'chats'> | null
  userGoal?: string | null
  onStartChain?: WorkflowChainAction
}) {
  const createWorkflowChain = useMutation(api.workflowChains.create)
  const chains = useQuery(api.workflowChains.listByChat, chatId ? { chatId } : 'skip') as
    | PersistedWorkflowChain[]
    | undefined

  const resolvedGoal = userGoal ?? DEFAULT_USER_GOAL

  return (
    <section className="space-y-3">
      <ActiveWorkflowChains chains={chains ?? []} />
      <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        Workflow chains
      </div>
      <WorkflowChainsList
        userGoal={resolvedGoal}
        onStartChain={onStartChain}
        onPersistChain={
          projectId && chatId
            ? async (template, goal) => {
                return await createWorkflowChain({
                  projectId,
                  chatId,
                  chainId: template.id,
                  label: template.label,
                  userGoal: goal,
                  currentStepId: template.steps[0]?.id,
                  steps: templateToPersistedSteps(template),
                })
              }
            : undefined
        }
      />
    </section>
  )
}
