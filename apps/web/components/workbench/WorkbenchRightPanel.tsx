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
  } = useWorkspaceRuntime()

  const activeTab = useWorkspaceUiStore((s) => s.rightPanelTab)
  const setActiveTab = useWorkspaceUiStore((s) => s.setRightPanelTab)

  const onSpecClick = () => useWorkspaceUiStore.getState().setSpecSurfaceMode('inspect')
  const onPlanClick = () => openRightPanelTab('plan')
  const onOpenArtifacts = () => openRightPanelTab('review')

  const isDrawerOpen = activeTab !== 'chat'
  const activeInspectorTab = isDrawerOpen ? activeTab : undefined

  const inspectorTabs: InspectorTabDef[] = [
    { id: 'plan', label: 'Plan' },
    { id: 'review', label: 'Review' },
    { id: 'run', label: 'Run' },
    { id: 'comments', label: 'Notes' },
  ]

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
        return <ArtifactPanel projectId={projectId} chatId={activeChatId} position="right" />
      case 'run':
        return (
          <InspectorRunContent
            chatId={activeChatId}
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
            planningDebug={planningDebug}
            snapshotEvents={snapshotEvents}
            subagentToolCalls={subagentToolCalls}
          />
        )
      case 'comments':
        return (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="surface-1 border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Notes — memory, evals
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
    />
  )
}
