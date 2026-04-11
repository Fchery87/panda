import { describe, expect, mock, test } from 'bun:test'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProjectChatInspector } from './ProjectChatInspector'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'

mock.module('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
          <div {...props}>{children}</div>
        ),
    }
  ),
}))

mock.module('@/components/chat/EvalPanel', () => ({
  EvalPanel: () => <div>eval-panel</div>,
}))

mock.module('@/components/chat/MemoryBankEditor', () => ({
  MemoryBankEditor: () => <div>memory-bank-editor</div>,
}))

mock.module('@/components/chat/RunProgressPanel', () => ({
  RunProgressPanel: () => <div>run-progress-panel</div>,
}))

mock.module('@/components/chat/SnapshotTimeline', () => ({
  SnapshotTimeline: () => <div>snapshot-timeline</div>,
}))

mock.module('@/components/chat/SubagentPanel', () => ({
  SubagentPanel: () => <div>subagent-panel</div>,
}))

mock.module('@/components/plan/PlanningIntakePopup', () => ({
  PlanningIntakeSurface: () => <div>planning-intake-surface</div>,
}))

mock.module('@/components/artifacts/ArtifactPanel', () => ({
  ArtifactPanel: () => <div>artifact-panel</div>,
}))

const generatedPlanArtifact: GeneratedPlanArtifact = {
  chatId: 'chat-1',
  sessionId: 'session-1',
  title: 'Inspector Structured Review',
  summary: 'Structured content should flow through the inspector.',
  markdown: '# Inspector Structured Review',
  sections: [{ id: 'goal', title: 'Goal', content: 'Review the structured plan.', order: 1 }],
  acceptanceChecks: ['Show the artifact title in the plan panel'],
  status: 'ready_for_review',
  generatedAt: 999,
}

describe('ProjectChatInspector', () => {
  test('renders structured review content from planningSession.generatedPlan on the plan tab', () => {
    const html = renderToStaticMarkup(
      <ProjectChatInspector
        projectId={'project-1' as never}
        chatId={null}
        isMobileLayout={false}
        isOpen={true}
        tab="plan"
        planningSession={{
          sessionId: 'session-1',
          status: 'ready_for_review',
          questions: [],
          answers: [],
          generatedPlan: generatedPlanArtifact,
        }}
        planningCurrentQuestion={null}
        onStartPlanningIntake={() => {}}
        onAnswerPlanningQuestion={() => {}}
        onClearPlanningIntake={() => {}}
        onOpenChange={() => {}}
        onTabChange={() => {}}
        liveSteps={[]}
        isStreaming={false}
        tracePersistenceStatus="live"
        onOpenFile={() => {}}
        onOpenArtifacts={() => {}}
        currentSpec={null}
        planStatus="awaiting_review"
        planDraft="# Draft"
        onSpecClick={() => {}}
        onPlanClick={() => {}}
        onResumeRuntimeSession={async () => {}}
        snapshotEvents={[]}
        subagentToolCalls={[]}
        planningDebug={null}
        onPlanDraftChange={() => {}}
        onSavePlanDraft={() => {}}
        onApprovePlan={() => {}}
        onBuildFromPlan={() => {}}
        isSavingPlanDraft={false}
        lastSavedAt={null}
        lastGeneratedAt={generatedPlanArtifact.generatedAt}
        approveDisabled={false}
        buildDisabled={false}
        memoryBank={null}
        onSaveMemoryBank={async () => {}}
        lastUserPrompt={null}
        lastAssistantReply={null}
        onRunEvalScenario={async () => ({ output: 'ok' })}
        generatedPlanArtifact={null}
      />
    )

    expect(html).toContain('Inspector Structured Review')
    expect(html).toContain('Structured content should flow through the inspector.')
    expect(html).toContain('Show the artifact title in the plan panel')
    expect(html).toContain('Structured Review')
  })
})
