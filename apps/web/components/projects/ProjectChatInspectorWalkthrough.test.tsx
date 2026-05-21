import { describe, expect, test, mock } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { InspectorRunContent } from './ProjectChatInspector'

mock.module('convex/react', () => ({
  useQuery: () => [],
}))

describe('InspectorRunContent walkthrough', () => {
  test('renders non-browser walkthrough evidence from pending diffs and run errors', () => {
    const html = renderToStaticMarkup(
      <InspectorRunContent
        chatId={null}
        liveSteps={[]}
        runEvents={[
          {
            type: 'tool_result',
            status: 'error',
            errorPreview: 'Typecheck failed',
            targetFilePaths: ['src/failed.ts'],
          },
        ]}
        latestRunReceipt={{
          runId: 'run-1',
          status: 'completed',
          startedAt: 1,
          completedAt: 2,
          receipt: null,
        }}
        isStreaming={false}
        tracePersistenceStatus="live"
        onOpenFile={() => {}}
        onOpenArtifacts={() => {}}
        currentSpec={null}
        planStatus="idle"
        planDraft=""
        onSpecClick={() => {}}
        onPlanClick={() => {}}
        onResumeRuntimeSession={async () => {}}
        snapshotEvents={[]}
        subagentToolCalls={[]}
        pendingDiffEntries={[
          {
            artifactId: 'artifact-1',
            path: 'src/generated.ts',
            status: 'added',
            reviewStatus: 'pending',
            hunks: [],
          },
        ]}
      />
    )

    expect(html).toContain('Walkthrough')
    expect(html).toContain('Files changed')
    expect(html).toContain('src/generated.ts')
    expect(html).toContain('Commands run')
    expect(html).toContain('Validation')
    expect(html).toContain('Known issues')
    expect(html).toContain('Typecheck failed')
  })
})
