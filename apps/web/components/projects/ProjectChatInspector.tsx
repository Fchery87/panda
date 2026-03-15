'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { Id } from '@convex/_generated/dataModel'
import { Settings2, X } from 'lucide-react'
import { EvalPanel } from '@/components/chat/EvalPanel'
import { MemoryBankEditor } from '@/components/chat/MemoryBankEditor'
import { RunProgressPanel } from '@/components/chat/RunProgressPanel'
import { SnapshotTimeline } from '@/components/chat/SnapshotTimeline'
import { SubagentPanel } from '@/components/chat/SubagentPanel'
import type { ToolCallInfo } from '@/components/chat/types'
import { PlanPanel } from '@/components/plan/PlanPanel'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { LiveProgressStep } from '@/components/chat/live-run-utils'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import type { PlanStatus } from '@/lib/chat/planDraft'
import type { TracePersistenceStatus } from '@/hooks/useRunEventBuffer'

export type InspectorTab = 'run' | 'plan' | 'artifacts' | 'memory' | 'evals'
export type ReviewTab = InspectorTab

type SnapshotEvent = {
  _id?: string
  type: string
  content?: string
  createdAt?: number
  snapshot?: {
    hash?: string
    step?: number
    files?: string[]
  }
}

export interface InspectorRunContentProps {
  chatId?: Id<'chats'> | null
  liveSteps: LiveProgressStep[]
  isStreaming: boolean
  tracePersistenceStatus: TracePersistenceStatus
  onOpenFile: (path: string) => void
  onOpenArtifacts: () => void
  currentSpec: FormalSpecification | null
  planStatus?: PlanStatus | null
  planDraft: string
  onSpecClick: () => void
  onPlanClick: () => void
  onResumeRuntimeSession: (sessionID: string) => Promise<void>
  snapshotEvents: SnapshotEvent[]
  subagentToolCalls: ToolCallInfo[]
}

export function InspectorRunContent({
  chatId,
  liveSteps,
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
}: InspectorRunContentProps) {
  return (
    <div className="m-0 space-y-3">
      <RunProgressPanel
        chatId={chatId}
        liveSteps={liveSteps}
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
      />
      <SnapshotTimeline events={snapshotEvents} />
      <SubagentPanel toolCalls={subagentToolCalls} />
    </div>
  )
}

export interface InspectorPlanContentProps {
  planDraft: string
  planStatus?: PlanStatus | null
  onPlanDraftChange: (value: string) => void
  onSavePlanDraft: () => void
  onApprovePlan: () => void
  onBuildFromPlan: () => void
  isSavingPlanDraft: boolean
  lastSavedAt?: number | null
  lastGeneratedAt?: number | null
  approveDisabled: boolean
  buildDisabled: boolean
}

export function InspectorPlanContent({
  planDraft,
  planStatus,
  onPlanDraftChange,
  onSavePlanDraft,
  onApprovePlan,
  onBuildFromPlan,
  isSavingPlanDraft,
  lastSavedAt,
  lastGeneratedAt,
  approveDisabled,
  buildDisabled,
}: InspectorPlanContentProps) {
  return (
    <div className="m-0 border border-border bg-background">
      <PlanPanel
        planDraft={planDraft}
        planStatus={planStatus ?? 'idle'}
        onChange={onPlanDraftChange}
        onSave={onSavePlanDraft}
        onApprove={onApprovePlan}
        onBuildFromPlan={onBuildFromPlan}
        isSaving={isSavingPlanDraft}
        lastSavedAt={lastSavedAt ?? null}
        lastGeneratedAt={lastGeneratedAt ?? null}
        approveDisabled={approveDisabled}
        buildDisabled={buildDisabled}
      />
    </div>
  )
}

export interface InspectorMemoryContentProps {
  memoryBank: string | null | undefined
  onSaveMemoryBank: (content: string) => Promise<void>
}

export function InspectorMemoryContent({
  memoryBank,
  onSaveMemoryBank,
}: InspectorMemoryContentProps) {
  return (
    <div className="m-0 border border-border bg-background">
      <MemoryBankEditor memoryBank={memoryBank} onSave={onSaveMemoryBank} />
    </div>
  )
}

export interface InspectorEvalsContentProps {
  projectId: Id<'projects'>
  chatId?: Id<'chats'> | null
  lastUserPrompt?: string | null
  lastAssistantReply?: string | null
  onRunEvalScenario?: (scenario: {
    input?: unknown
    prompt?: string
    expected?: unknown
    mode?: string
    evalMode?: 'read_only' | 'full'
  }) => Promise<{
    output: string
    error?: string
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  }>
}

export function InspectorEvalsContent({
  projectId,
  chatId,
  lastUserPrompt,
  lastAssistantReply,
  onRunEvalScenario,
}: InspectorEvalsContentProps) {
  return (
    <div className="m-0 border border-border bg-background">
      <EvalPanel
        projectId={projectId}
        chatId={chatId}
        lastUserPrompt={lastUserPrompt}
        lastAssistantReply={lastAssistantReply}
        onRunScenario={onRunEvalScenario}
      />
    </div>
  )
}

export interface ProjectChatInspectorProps
  extends
    InspectorRunContentProps,
    InspectorPlanContentProps,
    InspectorMemoryContentProps,
    InspectorEvalsContentProps {
  isMobileLayout: boolean
  isOpen: boolean
  tab: InspectorTab
  onOpenChange: (open: boolean) => void
  onTabChange: (tab: InspectorTab) => void
}

export function ProjectChatInspector({
  projectId,
  chatId,
  isMobileLayout,
  isOpen,
  tab,
  onOpenChange,
  onTabChange,
  liveSteps,
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
    <Tabs
      value={tab}
      onValueChange={(value) => onTabChange(value as InspectorTab)}
      className="gap-2"
    >
      <TabsList className="h-8 w-full justify-start rounded-none border border-border bg-background p-0 font-mono text-xs">
        <TabsTrigger
          value="run"
          className="h-full rounded-none border-r border-border px-3 font-mono text-xs uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Run
        </TabsTrigger>
        <TabsTrigger
          value="plan"
          className="h-full rounded-none border-r border-border px-3 font-mono text-xs uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Plan
        </TabsTrigger>
        <TabsTrigger
          value="artifacts"
          className="h-full rounded-none border-r border-border px-3 font-mono text-xs uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Artifacts
        </TabsTrigger>
        <TabsTrigger
          value="memory"
          className="h-full rounded-none border-r border-border px-3 font-mono text-xs uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Memory
        </TabsTrigger>
        <TabsTrigger
          value="evals"
          className="h-full rounded-none px-3 font-mono text-xs uppercase tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          Evals
        </TabsTrigger>
      </TabsList>

      <TabsContent value="run" className="m-0">
        <InspectorRunContent
          chatId={chatId}
          liveSteps={liveSteps}
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
          snapshotEvents={snapshotEvents}
          subagentToolCalls={subagentToolCalls}
        />
      </TabsContent>

      <TabsContent value="plan" className="m-0">
        <InspectorPlanContent
          planDraft={planDraft}
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
        <div className="m-0 h-[420px] border border-border bg-background">
          <ArtifactPanel projectId={projectId} chatId={chatId} position="right" />
        </div>
      </TabsContent>

      <TabsContent value="memory" className="m-0">
        <InspectorMemoryContent memoryBank={memoryBank} onSaveMemoryBank={onSaveMemoryBank} />
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
            className="absolute inset-0 z-20 bg-background/55 backdrop-blur-[1px]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="shadow-sharp-lg absolute inset-x-0 bottom-0 z-30 max-h-[85vh] border-t border-border bg-background sm:inset-x-3 sm:bottom-3 sm:max-h-[75vh] sm:border"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 bg-border sm:hidden" />
                <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                  <Settings2 className="h-3.5 w-3.5 text-primary" />
                  Review
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
            className="absolute inset-0 z-20 bg-background/30"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="shadow-sharp-lg absolute inset-x-0 bottom-0 z-30 max-h-[60vh] border-t border-border bg-background"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                <Settings2 className="h-3.5 w-3.5 text-primary" />
                Review
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
