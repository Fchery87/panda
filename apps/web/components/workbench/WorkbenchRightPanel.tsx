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

export interface WorkbenchRightPanelProps {
  projectId: Id<'projects'>
}

export function WorkbenchRightPanel({ projectId }: WorkbenchRightPanelProps) {
  const {
    activeChatId,
    runEvents,
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
  } = useWorkspaceRuntime()

  const activeTab = useWorkspaceUiStore((s) => s.rightPanelTab)
  const setActiveTab = useWorkspaceUiStore((s) => s.setRightPanelTab)

  const onSpecClick = () => useWorkspaceUiStore.getState().setSpecSurfaceMode('inspect')
  const onPlanClick = () => openRightPanelTab('plan')
  const onOpenArtifacts = () => openRightPanelTab('review')

  const isDrawerOpen = activeTab !== 'chat'
  const activeInspectorTab = isDrawerOpen ? activeTab : undefined

  const inspectorTabs: InspectorTabDef[] = [
    { id: 'run', label: 'Run' },
    { id: 'plan', label: 'Plan' },
    { id: 'review', label: 'Changes' },
    { id: 'comments', label: 'Notes' },
  ]

  const inspectorTitle =
    activeTab === 'run'
      ? 'Run and Recovery'
      : activeTab === 'plan'
        ? 'Plan and Approval'
        : activeTab === 'review'
          ? 'Changed Work'
          : 'Memory and Evals'

  const inspectorSummary =
    activeTab === 'run'
      ? 'Track execution progress, snapshots, and resumable sessions.'
      : activeTab === 'plan'
        ? 'Review the implementation contract and move into execution deliberately.'
        : activeTab === 'review'
          ? 'Inspect artifacts and changed work before continuing.'
          : 'Keep persistent context and eval checks close to the active chat.'

  const reviewSummary = activeChatId
    ? 'Generated artifacts and changed work from the current chat session appear here for inspection.'
    : 'Open or create a chat to review generated artifacts and changed work.'

  const notesSummary = memoryBank?.trim()
    ? 'Project memory is available. Use the rail to maintain context and run repeatable eval checks.'
    : 'No persistent memory yet. Capture durable context and verification checks here.'

  const getInspectorContent = () => {
    switch (activeTab) {
      case 'plan':
        return (
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
        )
      case 'review':
        return (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="surface-0 border-b border-border px-3 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Changed work and artifacts
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
      case 'comments':
        return (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="surface-0 border-b border-border px-3 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Notes, memory, evals
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{notesSummary}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
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
      inspectorTitle={inspectorTitle}
      inspectorSummary={inspectorSummary}
    />
  )
}
