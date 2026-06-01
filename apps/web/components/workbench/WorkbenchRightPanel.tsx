'use client'

import type { Id } from '@convex/_generated/dataModel'
import type { RightPanelTabId, InspectorTabDef } from '@/components/panels/RightPanel'
import { RightPanel } from '@/components/panels/RightPanel'
import {
  InspectorPlanContent,
  InspectorRunContent,
  InspectorMemoryContent,
  InspectorEvalsContent,
} from '@/components/projects/ProjectChatInspector'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import { AdvisorReviewRequestsPanel } from '@/components/workbench/AdvisorReviewRequestsPanel'
import { AdvisorReviewsPanel } from '@/components/workbench/AdvisorReviewsPanel'
import { useWorkspaceRuntime } from '@/contexts/WorkspaceRuntimeContext'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import { buildExecutionSessionInspectorViewModel } from '@/lib/workspace/execution-session-inspector-view-model'

export interface WorkbenchRightPanelProps {
  projectId: Id<'projects'>
}

export function WorkbenchRightPanel({ projectId }: WorkbenchRightPanelProps) {
  const {
    activeChatId,
    runEvents,
    latestRunReceipt,
    liveSteps,
    isStreaming,
    tracePersistenceStatus,
    onOpenFile,
    currentSpec,
    planStatus,
    planDraft,
    onPlanDraftChange,
    onSavePlanDraft,
    onPlanApprove,
    onBuildFromPlan,
    isSavingPlanDraft,
    planApproveDisabled,
    planBuildDisabled,
    lastSavedAt,
    lastGeneratedAt,
    snapshotEvents,
    subagentToolCalls,
    onResumeRuntimeSession,
    memoryBank,
    onSaveMemoryBank,
    lastUserPrompt,
    lastAssistantReply,
    onRunEvalScenario,
    planningDebug,
    openRightPanelTab,
    writeFileToRuntime,
    executionSession,
    pendingDiffEntries,
  } = useWorkspaceRuntime()

  const activeTab = useWorkspaceUiStore((s) => s.rightPanelTab)
  const setActiveTab = useWorkspaceUiStore((s) => s.setRightPanelTab)
  const setActiveCenterTab = useWorkspaceUiStore((s) => s.setActiveCenterTab)

  const onSpecClick = () => useWorkspaceUiStore.getState().setSpecSurfaceMode('inspect')
  const onPlanClick = () => openRightPanelTab('context')
  const onOpenArtifacts = () => openRightPanelTab('changes')
  const onReviewDiff = () => {
    setActiveCenterTab('diff')
    openRightPanelTab('changes')
  }

  const activeInspectorTab = activeTab

  const inspectorTabs: InspectorTabDef[] = [
    { id: 'proof', label: 'Run' },
    { id: 'changes', label: 'Changes' },
    { id: 'context', label: 'Context' },
  ]

  const inspectorView = buildExecutionSessionInspectorViewModel(activeTab, executionSession)

  const getInspectorContent = () => {
    switch (activeTab) {
      case 'context':
        return (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="surface-0 border-b border-border px-3 py-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Plan, memory, evals
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
              <InspectorPlanContent
                planDraft={planDraft}
                planStatus={planStatus}
                onPlanDraftChange={onPlanDraftChange}
                onSavePlanDraft={onSavePlanDraft}
                onApprovePlan={onPlanApprove}
                onBuildFromPlan={onBuildFromPlan}
                isSavingPlanDraft={isSavingPlanDraft}
                lastSavedAt={lastSavedAt}
                lastGeneratedAt={lastGeneratedAt}
                approveDisabled={planApproveDisabled}
                buildDisabled={planBuildDisabled}
                pendingDiffEntries={pendingDiffEntries}
                onReviewDiff={onReviewDiff}
              />
              <AdvisorReviewRequestsPanel
                chatId={activeChatId}
                runAdvisorReviewer={async (prompt) => {
                  const result = await onRunEvalScenario({
                    prompt,
                    mode: 'ask',
                    evalMode: 'read_only',
                    subagentName: 'advisor-reviewer',
                  })
                  if (result.error) throw new Error(result.error)
                  return result.output
                }}
              />
              <AdvisorReviewsPanel chatId={activeChatId} />
              <InspectorMemoryContent
                projectId={projectId}
                memoryBank={memoryBank}
                onSaveMemoryBank={onSaveMemoryBank}
              />
              <InspectorEvalsContent
                projectId={projectId}
                chatId={activeChatId}
                lastUserPrompt={lastUserPrompt}
                lastAssistantReply={lastAssistantReply}
                onRunEvalScenario={onRunEvalScenario}
              />
            </div>
          </div>
        )
      case 'changes':
        return (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="surface-0 border-b border-border px-3 py-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Session changed work
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <ArtifactPanel
                projectId={projectId}
                chatId={activeChatId}
                position="right"
                writeFileToRuntime={writeFileToRuntime}
                onOpenFile={onOpenFile}
                onReviewDiff={onReviewDiff}
              />
            </div>
          </div>
        )
      case 'proof':
        return (
          <div className="h-full min-h-0 overflow-auto p-3">
            <InspectorRunContent
              chatId={activeChatId}
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
              pendingDiffEntries={pendingDiffEntries}
            />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <RightPanel
      inspectorContent={getInspectorContent()}
      inspectorTabs={inspectorTabs}
      activeInspectorTab={activeInspectorTab}
      onInspectorTabChange={(tab) => setActiveTab(tab as RightPanelTabId)}
      inspectorTitle={inspectorView.title}
      inspectorSummary={inspectorView.summary}
      inspectorEyebrow={inspectorView.eyebrow}
    />
  )
}
