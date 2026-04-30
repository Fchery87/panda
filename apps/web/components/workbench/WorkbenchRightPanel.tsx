'use client'

import type { Id } from '@convex/_generated/dataModel'
import type { RightPanelTabId, InspectorTabDef } from '@/components/panels/RightPanel'
import { RightPanel } from '@/components/panels/RightPanel'
import { ProjectChatPanel } from '@/components/projects/ProjectChatPanel'
import {
  InspectorPlanContent,
  InspectorRunContent,
  InspectorMemoryContent,
  InspectorEvalsContent,
} from '@/components/projects/ProjectChatInspector'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
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
  } = useWorkspaceRuntime()

  const activeTab = useWorkspaceUiStore((s) => s.rightPanelTab)
  const setActiveTab = useWorkspaceUiStore((s) => s.setRightPanelTab)

  const onSpecClick = () => useWorkspaceUiStore.getState().setSpecSurfaceMode('inspect')
  const onPlanClick = () => openRightPanelTab('context')
  const onOpenArtifacts = () => openRightPanelTab('changes')

  const isDrawerOpen = activeTab !== 'chat'
  const activeInspectorTab = isDrawerOpen ? activeTab : undefined

  const inspectorTabs: InspectorTabDef[] = [
    { id: 'run', label: 'Run' },
    { id: 'changes', label: 'Changes' },
    { id: 'context', label: 'Context' },
    { id: 'preview', label: 'Preview' },
  ]

  const inspectorView = buildExecutionSessionInspectorViewModel(activeTab, executionSession)

  const reviewSummary = activeChatId
    ? 'Generated artifacts and changed work from the current chat session appear here for inspection.'
    : 'Open or create a chat to review generated artifacts and changed work.'

  const getInspectorContent = () => {
    switch (activeTab) {
      case 'context':
        return (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="surface-0 border-b border-border px-3 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Plan, memory, evals
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Keep the active plan, durable project memory, and repeatable checks attached to the
                current chat instead of scattering them across separate rails.
              </p>
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
              />
              <InspectorMemoryContent memoryBank={memoryBank} onSaveMemoryBank={onSaveMemoryBank} />
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
            <div className="surface-0 border-b border-border px-3 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Session changed work
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{reviewSummary}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <ArtifactPanel
                projectId={projectId}
                chatId={activeChatId}
                position="right"
                writeFileToRuntime={writeFileToRuntime}
              />
            </div>
          </div>
        )
      case 'run':
        return (
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
          />
        )
      case 'preview':
        return (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="surface-0 border-b border-border px-3 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Session preview
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Preview will show browser or app output for the active run when a runtime surface is
                available.
              </p>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center p-6">
              <div className="max-w-sm border border-dashed border-border bg-background/70 px-4 py-4 text-center">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  No preview attached
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {inspectorView.emptyDetail}
                </p>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <RightPanel
      chatContent={<ProjectChatPanel projectId={projectId} />}
      inspectorContent={getInspectorContent()}
      inspectorTabs={inspectorTabs}
      activeInspectorTab={activeInspectorTab}
      onInspectorTabChange={(tab) => setActiveTab(tab as RightPanelTabId)}
      isInspectorOpen={isDrawerOpen}
      onInspectorToggle={() => setActiveTab('chat')}
      inspectorTitle={inspectorView.title}
      inspectorSummary={inspectorView.summary}
      inspectorEyebrow={inspectorView.eyebrow}
    />
  )
}
