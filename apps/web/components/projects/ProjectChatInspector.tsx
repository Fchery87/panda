'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { Id } from '@convex/_generated/dataModel'
import { Settings2, X } from 'lucide-react'
import { PlanningIntakeSurface } from '@/components/plan/PlanningIntakePopup'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import { WorkflowArtifactsPanel } from '@/components/workbench/WorkflowArtifactsPanel'
import { WorkflowChainsPanel } from '@/components/workbench/WorkflowChainsPanel'
import { AdvisorReviewsPanel } from '@/components/workbench/AdvisorReviewsPanel'
import { AdvisorReviewRequestsPanel } from '@/components/workbench/AdvisorReviewRequestsPanel'
import { InspectorContextContent } from '@/components/chat/inspector/InspectorContextContent'
import {
  InspectorEvalsContent,
  type InspectorEvalsContentProps,
} from '@/components/chat/inspector/InspectorEvalsContent'
import {
  InspectorMemoryContent,
  type InspectorMemoryContentProps,
} from '@/components/chat/inspector/InspectorMemoryContent'
import {
  InspectorPlanContent,
  type InspectorPlanContentProps,
} from '@/components/chat/inspector/InspectorPlanContent'
import {
  InspectorRunContent,
  type InspectorRunContentProps,
} from '@/components/chat/inspector/InspectorRunContent'
import { InspectorResearchContent } from '@/components/chat/inspector/InspectorResearchContent'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { GeneratedPlanArtifact, PlanningAnswer, PlanningQuestion } from '@/lib/planning/types'

export { InspectorEvalsContent } from '@/components/chat/inspector/InspectorEvalsContent'
export { InspectorMemoryContent } from '@/components/chat/inspector/InspectorMemoryContent'
export { InspectorPlanContent } from '@/components/chat/inspector/InspectorPlanContent'
export { InspectorRunContent } from '@/components/chat/inspector/InspectorRunContent'

type PlanningSessionView = {
  sessionId: string
  status: string
  questions: PlanningQuestion[]
  answers: PlanningAnswer[]
  generatedPlan?: GeneratedPlanArtifact
} | null

export type InspectorTab =
  | 'run'
  | 'context'
  | 'plan'
  | 'artifacts'
  | 'research'
  | 'memory'
  | 'evals'
export type ReviewTab = InspectorTab

export interface ProjectChatInspectorProps
  extends
    InspectorRunContentProps,
    InspectorPlanContentProps,
    InspectorMemoryContentProps,
    InspectorEvalsContentProps {
  isMobileLayout: boolean
  isOpen: boolean
  tab: InspectorTab
  planningSession: PlanningSessionView
  planningCurrentQuestion: PlanningQuestion | null
  onStartPlanningIntake: () => Promise<unknown> | unknown
  onAnswerPlanningQuestion: (input: {
    questionId: string
    selectedOptionId?: string
    freeformValue?: string
    source: 'suggestion' | 'freeform'
  }) => Promise<unknown> | unknown
  onClearPlanningIntake: () => Promise<unknown> | unknown
  onStartWorkflowChain?: (
    prompt: string,
    targetMode?: ChatMode,
    metadata?: { workflowChainId: Id<'workflowChains'>; workflowChainStepId: string }
  ) => void
  onOpenChange: (open: boolean) => void
  onTabChange: (tab: InspectorTab) => void
}

export function ProjectChatInspector({
  projectId,
  chatId,
  isMobileLayout,
  isOpen,
  tab,
  planningSession,
  planningCurrentQuestion,
  onStartPlanningIntake,
  onAnswerPlanningQuestion,
  onClearPlanningIntake,
  onStartWorkflowChain,
  onOpenChange,
  onTabChange,
  liveSteps,
  runEvents,
  latestRunReceipt,
  isStreaming,
  tracePersistenceStatus,
  onOpenFile,
  onOpenArtifacts,
  currentSpec,
  planStatus,
  planDraft,
  onSpecClick,
  onPlanClick,
  onResumeRuntimeSession,
  snapshotEvents,
  subagentToolCalls,
  planningDebug,
  onPlanDraftChange,
  onSavePlanDraft,
  onApprovePlan,
  onBuildFromPlan,
  isSavingPlanDraft,
  lastSavedAt,
  lastGeneratedAt,
  approveDisabled,
  buildDisabled,
  memoryBank,
  onSaveMemoryBank,
  lastUserPrompt,
  lastAssistantReply,
  onRunEvalScenario,
}: ProjectChatInspectorProps) {
  const tabs = (
    <div className="space-y-3">
      <PlanningIntakeSurface
        session={planningSession}
        currentQuestion={planningCurrentQuestion}
        onStartIntake={onStartPlanningIntake}
        onAnswerQuestion={onAnswerPlanningQuestion}
        onClearIntake={onClearPlanningIntake}
        key={planningSession?.sessionId ?? 'planning-intake'}
      />
      <Tabs
        value={tab}
        onValueChange={(value) => onTabChange(value as InspectorTab)}
        className="gap-2"
      >
        <div className="overflow-x-auto pb-1">
          <TabsList className="shadow-sharp-sm bg-background/90 h-9 min-w-max justify-start rounded-none border border-border p-0 font-mono text-xs">
            <TabsTrigger
              value="run"
              className="h-full rounded-none border-r border-border px-3 font-mono text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Run
            </TabsTrigger>
            <TabsTrigger
              value="context"
              className="h-full rounded-none border-r border-border px-3 font-mono text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Context
            </TabsTrigger>
            <TabsTrigger
              value="plan"
              className="h-full rounded-none border-r border-border px-3 font-mono text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Plan
            </TabsTrigger>
            <TabsTrigger
              value="artifacts"
              className="h-full rounded-none border-r border-border px-3 font-mono text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Artifacts
            </TabsTrigger>
            <TabsTrigger
              value="research"
              className="h-full rounded-none border-r border-border px-3 font-mono text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Research
            </TabsTrigger>
            <TabsTrigger
              value="memory"
              className="h-full rounded-none border-r border-border px-3 font-mono text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Memory
            </TabsTrigger>
            <TabsTrigger
              value="evals"
              className="h-full rounded-none px-3 font-mono text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Evals
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="run" className="m-0">
          <InspectorRunContent
            chatId={chatId}
            liveSteps={liveSteps}
            runEvents={runEvents}
            latestRunReceipt={latestRunReceipt}
            isStreaming={isStreaming}
            tracePersistenceStatus={tracePersistenceStatus}
            onOpenFile={onOpenFile}
            onOpenArtifacts={onOpenArtifacts}
            currentSpec={currentSpec}
            planStatus={planStatus}
            planDraft={planDraft}
            onSpecClick={onSpecClick}
            onPlanClick={onPlanClick}
            onResumeRuntimeSession={onResumeRuntimeSession}
            planningDebug={planningDebug}
            snapshotEvents={snapshotEvents}
            subagentToolCalls={subagentToolCalls}
          />
        </TabsContent>

        <TabsContent value="context" className="m-0">
          <InspectorContextContent projectId={projectId} runEvents={runEvents} />
        </TabsContent>

        <TabsContent value="plan" className="m-0">
          <div className="mb-3 space-y-3">
            <div className="border border-border bg-background p-3">
              <WorkflowChainsPanel
                projectId={projectId}
                chatId={chatId}
                userGoal={lastUserPrompt}
                onStartChain={onStartWorkflowChain}
              />
            </div>
            <div className="border border-border bg-background p-3">
              <AdvisorReviewRequestsPanel chatId={chatId} />
            </div>
            <div className="border border-border bg-background p-3">
              <AdvisorReviewsPanel chatId={chatId} />
            </div>
          </div>
          <InspectorPlanContent
            planDraft={planDraft}
            generatedPlanArtifact={planningSession?.generatedPlan ?? null}
            planStatus={planStatus}
            onPlanDraftChange={onPlanDraftChange}
            onSavePlanDraft={onSavePlanDraft}
            onApprovePlan={onApprovePlan}
            onBuildFromPlan={onBuildFromPlan}
            isSavingPlanDraft={isSavingPlanDraft}
            lastSavedAt={lastSavedAt}
            lastGeneratedAt={lastGeneratedAt}
            approveDisabled={approveDisabled}
            buildDisabled={buildDisabled}
          />
        </TabsContent>

        <TabsContent value="artifacts" className="m-0">
          <div className="m-0 h-[420px] space-y-3 overflow-y-auto border border-border bg-background p-3">
            <WorkflowArtifactsPanel chatId={chatId} />
            <div className="border-t border-border pt-3">
              <ArtifactPanel projectId={projectId} chatId={chatId} position="right" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="research" className="m-0">
          <InspectorResearchContent projectId={projectId} chatId={chatId} />
        </TabsContent>

        <TabsContent value="memory" className="m-0">
          <InspectorMemoryContent
            projectId={projectId}
            memoryBank={memoryBank}
            onSaveMemoryBank={onSaveMemoryBank}
          />
        </TabsContent>

        <TabsContent value="evals" className="m-0">
          <InspectorEvalsContent
            projectId={projectId}
            chatId={chatId}
            lastUserPrompt={lastUserPrompt}
            lastAssistantReply={lastAssistantReply}
            onRunEvalScenario={onRunEvalScenario}
          />
        </TabsContent>
      </Tabs>
    </div>
  )

  return (
    <AnimatePresence>
      {isMobileLayout && isOpen ? (
        <>
          <motion.button
            type="button"
            aria-label="Close inspector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="bg-background/55 absolute inset-0 z-20 backdrop-blur-[1px]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="shadow-sharp-lg absolute inset-x-0 bottom-0 z-30 max-h-[85vh] border-t border-border bg-background sm:inset-x-3 sm:bottom-3 sm:max-h-[75vh] sm:border"
          >
            <div className="bg-background/90 flex items-center justify-between border-b border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 bg-border sm:hidden" />
                <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                  <Settings2 className="h-3.5 w-3.5 text-primary" />
                  Evidence
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-none"
                onClick={() => onOpenChange(false)}
                aria-label="Close inspector"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[calc(85vh-44px)] overflow-y-auto p-2 pb-[env(safe-area-inset-bottom)] sm:max-h-[calc(75vh-44px)] sm:p-3">
              {tabs}
            </div>
          </motion.div>
        </>
      ) : null}

      {!isMobileLayout && isOpen ? (
        <>
          <motion.button
            type="button"
            aria-label="Close inspector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="bg-background/30 absolute inset-0 z-20"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="shadow-sharp-lg absolute inset-x-0 bottom-0 z-30 max-h-[60vh] border-t border-border bg-background"
          >
            <div className="bg-background/90 flex items-center justify-between border-b border-border px-3 py-2">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                <Settings2 className="h-3.5 w-3.5 text-primary" />
                Evidence
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-none"
                onClick={() => onOpenChange(false)}
                aria-label="Close inspector"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[calc(60vh-44px)] overflow-y-auto p-2">{tabs}</div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
