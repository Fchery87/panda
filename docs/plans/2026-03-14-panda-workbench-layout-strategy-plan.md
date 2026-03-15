# Panda Workbench Layout Strategy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Rebuild Panda's project workspace around an editor-first layout with a
persistent but secondary AI rail, a dedicated Review surface, and contextual
preview instead of permanent preview panels.

**Architecture:** Remove preview as a peer workspace surface on desktop and
mobile. Introduce a structured `ReviewPanel` surface for run progress, plans,
specs, artifacts, memory, and evals. Simplify navigation so the editor/workbench
is always primary, the AI rail is always present on desktop, and preview only
appears when a real runtime URL is available and the user explicitly opens it.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Framer
Motion, Convex, Bun test

**Design Reference:**
`docs/plans/2026-03-14-panda-workbench-layout-strategy-design.md`

---

## Phase 1: Remove Permanent Preview As A Primary Surface

### Task 1: Rewrite `RightPanel` Into A Dedicated AI Rail

**Files:**

- Modify: `apps/web/components/panels/RightPanel.tsx`
- Test: `apps/web/components/panels/RightPanel.test.tsx`

**Step 1: Write the failing test**

```tsx
// apps/web/components/panels/RightPanel.test.tsx
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { RightPanel } from './RightPanel'

describe('RightPanel', () => {
  test('renders only the chat rail and mode toggle, not preview tabs', () => {
    const html = renderToStaticMarkup(
      <RightPanel
        chatContent={<div>chat</div>}
        chatInput={<div>input</div>}
        automationMode="manual"
        onAutomationModeChange={() => {}}
      />
    )

    expect(html).toContain('chat')
    expect(html).toContain('input')
    expect(html).not.toContain('Preview')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test ./components/panels/RightPanel.test.tsx` Expected:
FAIL because the current implementation still renders preview tabs or requires
`previewContent`

**Step 3: Write minimal implementation**

Rewrite `RightPanel.tsx` to:

- remove `previewContent`
- remove preview tab state and `RightPanelTab`
- render a single-column AI rail with:
  - compact rail header
  - `ModeToggle`
  - `chatContent`
  - `chatInput`

Target shape:

```tsx
interface RightPanelProps {
  chatContent: ReactNode
  chatInput: ReactNode
  automationMode: 'manual' | 'auto'
  onAutomationModeChange: (mode: 'manual' | 'auto') => void
  isStreaming?: boolean
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test ./components/panels/RightPanel.test.tsx` Expected:
PASS

**Step 5: Commit**

```bash
git add apps/web/components/panels/RightPanel.tsx apps/web/components/panels/RightPanel.test.tsx
git commit -m "refactor: convert RightPanel into dedicated AI rail"
```

---

### Task 2: Remove Desktop Preview From `ProjectWorkspaceLayout`

**Files:**

- Modify: `apps/web/components/projects/ProjectWorkspaceLayout.tsx`
- Test: `apps/web/components/projects/project-workspace-layout.test.tsx`

**Step 1: Write the failing test**

```tsx
// apps/web/components/projects/project-workspace-layout.test.tsx
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProjectWorkspaceLayout } from './ProjectWorkspaceLayout'

describe('ProjectWorkspaceLayout desktop shell', () => {
  test('does not render PreviewPanel in the desktop right rail', () => {
    const html = renderToStaticMarkup(
      <ProjectWorkspaceLayout
        projectId={'project' as never}
        files={[]}
        selectedFilePath={null}
        openTabs={[]}
        onSelectFile={() => {}}
        onCloseTab={() => {}}
        onCreateFile={async () => {}}
        onRenameFile={async () => {}}
        onDeleteFile={async () => {}}
        onSaveFile={async () => {}}
        onEditorDirtyChange={() => {}}
        isMobileLayout={false}
        isCompactDesktopLayout={false}
        mobilePrimaryPanel="workspace"
        onMobilePrimaryPanelChange={() => {}}
        mobileUnreadCount={0}
        isMobileKeyboardOpen={false}
        chatPanel={<div>chat-panel</div>}
        isChatPanelOpen={true}
        automationMode="manual"
        onAutomationModeChange={() => {}}
        chatMode="code"
        onModeChange={() => {}}
        cursorPosition={null}
        isStreaming={false}
        currentSpec={null}
        isSpecDrawerOpen={false}
        onSpecDrawerOpenChange={() => {}}
      />
    )

    expect(html).toContain('chat-panel')
    expect(html).not.toContain('Preview')
  })
})
```

**Step 2: Run test to verify it fails**

Run:
`cd apps/web && bun test ./components/projects/project-workspace-layout.test.tsx`
Expected: FAIL because desktop `RightPanel` still receives preview content

**Step 3: Write minimal implementation**

Update `ProjectWorkspaceLayout.tsx` desktop branch to:

- stop rendering `PreviewPanel` in `RightPanel`
- pass only `chatContent` and `chatInput={null}`
- keep the two-column layout:
  - center workbench
  - right AI rail

Do not introduce preview replacement in this task.

**Step 4: Run test to verify it passes**

Run:
`cd apps/web && bun test ./components/projects/project-workspace-layout.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/components/projects/ProjectWorkspaceLayout.tsx apps/web/components/projects/project-workspace-layout.test.tsx
git commit -m "refactor: remove desktop preview from project workspace shell"
```

---

### Task 3: Remove Mobile Preview As A Primary Tab

**Files:**

- Modify: `apps/web/components/projects/ProjectWorkspaceLayout.tsx`
- Modify: `apps/web/contexts/WorkspaceContext.tsx`
- Modify: `apps/web/hooks/useProjectWorkspaceUi.ts`
- Test: `apps/web/hooks/useProjectWorkspaceUi.mobile.test.ts`

**Step 1: Write the failing test**

```ts
// apps/web/hooks/useProjectWorkspaceUi.mobile.test.ts
import { describe, expect, test } from 'bun:test'

describe('mobile panel types', () => {
  test('mobile primary panel no longer includes preview', async () => {
    const mod = await import('./useProjectWorkspaceUi')
    expect(mod.useProjectWorkspaceUi).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails for the right reason**

Run: `cd apps/web && bun test ./hooks/useProjectWorkspaceUi.mobile.test.ts`
Expected: PASS import but code still contains `'preview'` in type definitions

Then run:

```bash
cd apps/web && rg -n "'workspace' \\| 'chat' \\| 'preview'|mobilePrimaryPanel.*preview" hooks contexts components/projects
```

Expected: existing references found

**Step 3: Write minimal implementation**

Change mobile primary navigation to:

- `workspace`
- `chat`
- `review`

Tasks:

- update `WorkspaceContext.tsx`
- update `useProjectWorkspaceUi.ts`
- update `ProjectWorkspaceLayout.tsx` bottom mobile nav labels
- replace current mobile preview destination with a placeholder `reviewPanel`
  prop to be added in Phase 2

For this task, use a temporary placeholder:

```tsx
mobilePrimaryPanel === 'review' ? <div>review-panel</div> : ...
```

**Step 4: Run verification**

Run:

```bash
cd apps/web && bun test ./hooks/useProjectWorkspaceUi.mobile.test.ts
cd apps/web && npx tsc --noEmit --pretty false
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/components/projects/ProjectWorkspaceLayout.tsx apps/web/contexts/WorkspaceContext.tsx apps/web/hooks/useProjectWorkspaceUi.ts apps/web/hooks/useProjectWorkspaceUi.mobile.test.ts
git commit -m "refactor: replace mobile preview primary tab with review destination"
```

---

## Phase 2: Introduce A Dedicated Review Surface

### Task 4: Create `ReviewPanel` Shared Surface

**Files:**

- Create: `apps/web/components/review/ReviewPanel.tsx`
- Create: `apps/web/components/review/ReviewPanel.test.tsx`

**Step 1: Write the failing test**

```tsx
// apps/web/components/review/ReviewPanel.test.tsx
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReviewPanel } from './ReviewPanel'

describe('ReviewPanel', () => {
  test('renders run, plan, artifacts, memory, and eval review tabs', () => {
    const html = renderToStaticMarkup(
      <ReviewPanel
        activeTab="run"
        onTabChange={() => {}}
        runContent={<div>run</div>}
        planContent={<div>plan</div>}
        artifactsContent={<div>artifacts</div>}
        memoryContent={<div>memory</div>}
        evalsContent={<div>evals</div>}
      />
    )

    expect(html).toContain('Run')
    expect(html).toContain('Plan')
    expect(html).toContain('Artifacts')
    expect(html).toContain('Memory')
    expect(html).toContain('Evals')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test ./components/review/ReviewPanel.test.tsx`
Expected: FAIL because file does not exist

**Step 3: Write minimal implementation**

Create `ReviewPanel.tsx` using `TabContainer`.

API:

```tsx
type ReviewTab = 'run' | 'plan' | 'artifacts' | 'memory' | 'evals'
```

It should:

- render a compact header
- use `TabContainer`
- accept each content surface as a prop
- support controlled `activeTab`

**Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test ./components/review/ReviewPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/components/review/ReviewPanel.tsx apps/web/components/review/ReviewPanel.test.tsx
git commit -m "feat: add dedicated ReviewPanel surface"
```

---

### Task 5: Re-scope `ProjectChatInspector` Into Review Content Provider

**Files:**

- Modify: `apps/web/components/projects/ProjectChatInspector.tsx`
- Test: `apps/web/components/projects/project-chat-inspector.test.tsx`

**Step 1: Write the failing test**

```tsx
// apps/web/components/projects/project-chat-inspector.test.tsx
import { describe, expect, test } from 'bun:test'

describe('ProjectChatInspector exports', () => {
  test('exports ProjectChatInspector and review tab type', async () => {
    const mod = await import('./ProjectChatInspector')
    expect(mod.ProjectChatInspector).toBeDefined()
  })
})
```

**Step 2: Run test to verify baseline**

Run:
`cd apps/web && bun test ./components/projects/project-chat-inspector.test.tsx`
Expected: PASS

**Step 3: Write minimal implementation**

Refactor `ProjectChatInspector.tsx` so it remains the provider of:

- run content
- plan content
- memory content
- eval content

But stop treating it as the desktop default companion surface.

Changes:

- keep mobile sheet behavior
- expose content blocks through local composition helpers
- prepare it for embedding inside `ReviewPanel` in a later task

Do not fully rewrite behavior yet. Keep current runtime behavior intact.

**Step 4: Run verification**

Run:

```bash
cd apps/web && bun test ./components/projects/project-chat-inspector.test.tsx
cd apps/web && npx tsc --noEmit --pretty false
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/components/projects/ProjectChatInspector.tsx apps/web/components/projects/project-chat-inspector.test.tsx
git commit -m "refactor: prepare ProjectChatInspector as review content provider"
```

---

### Task 6: Add Review Surface To `ProjectWorkspaceLayout`

**Files:**

- Modify: `apps/web/components/projects/ProjectWorkspaceLayout.tsx`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Add review panel prop wiring**

In `page.tsx`, create a `reviewPanelContent` node using:

- `ProjectChatInspector`
- `ArtifactPanel` or artifact review content
- current run/plan/memory/eval content

In `ProjectWorkspaceLayout.tsx`:

- add `reviewPanel: React.ReactNode`
- desktop: render Review surface as a drawer or overlay trigger path, not
  permanent right panel
- mobile: replace placeholder `review-panel` with the real `reviewPanel` prop

**Step 2: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty false` Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/components/projects/ProjectWorkspaceLayout.tsx apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx
git commit -m "feat: wire dedicated review surface into project workspace layout"
```

---

## Phase 3: Simplify Navigation

### Task 7: Simplify `SidebarRail` Destinations

**Files:**

- Modify: `apps/web/components/sidebar/SidebarRail.tsx`
- Modify: `apps/web/components/workbench/Workbench.tsx`
- Modify: `apps/web/components/sidebar/SidebarFlyout.tsx`

**Step 1: Remove or demote current destinations**

Update `SidebarSection` to:

- remove `builder`
- remove `new-chat`

Recommended destinations:

- `explorer`
- `search`
- `history`
- `specs`
- `git`
- `terminal`

Move “New Chat” into:

- chat rail primary action
- or history flyout header action

**Step 2: Write minimal implementation**

Update all render branches in `Workbench.tsx` and labels in `SidebarFlyout.tsx`.

**Step 3: Verify compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty false` Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/components/sidebar/SidebarRail.tsx apps/web/components/workbench/Workbench.tsx apps/web/components/sidebar/SidebarFlyout.tsx
git commit -m "refactor: simplify sidebar destinations around core workbench flows"
```

---

### Task 8: Move New Chat Action Into History / Chat Rail

**Files:**

- Modify: `apps/web/components/sidebar/SidebarHistoryPanel.tsx`
- Modify: `apps/web/components/projects/ProjectChatPanel.tsx`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Write the failing test**

```tsx
// apps/web/components/sidebar/sidebar-history-panel.test.tsx
import { describe, expect, test } from 'bun:test'

describe('SidebarHistoryPanel', () => {
  test('supports a primary new chat action', async () => {
    const mod = await import('./SidebarHistoryPanel')
    expect(mod.SidebarHistoryPanel).toBeDefined()
  })
})
```

**Step 2: Run test to verify baseline**

Run:
`cd apps/web && bun test ./components/sidebar/sidebar-history-panel.test.tsx`
Expected: PASS

**Step 3: Write minimal implementation**

Add `onNewChat` support to `SidebarHistoryPanel` and/or a top-level new-chat
button in `ProjectChatPanel`.

Goal:

- remove need for `new-chat` rail item
- keep new chat creation obvious

**Step 4: Verify**

Run:

```bash
cd apps/web && bun test ./components/sidebar/sidebar-history-panel.test.tsx
cd apps/web && npx tsc --noEmit --pretty false
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/components/sidebar/SidebarHistoryPanel.tsx apps/web/components/projects/ProjectChatPanel.tsx apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx
git commit -m "refactor: move new chat creation into history and chat surfaces"
```

---

## Phase 4: Reintroduce Preview As Contextual Runtime Validation

### Task 9: Create Runtime Preview State

**Files:**

- Create: `apps/web/hooks/useRuntimePreview.ts`
- Create: `apps/web/hooks/useRuntimePreview.test.ts`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Write the failing test**

```ts
// apps/web/hooks/useRuntimePreview.test.ts
import { describe, expect, test } from 'bun:test'

describe('useRuntimePreview exports', () => {
  test('exports useRuntimePreview', async () => {
    const mod = await import('./useRuntimePreview')
    expect(mod.useRuntimePreview).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test ./hooks/useRuntimePreview.test.ts` Expected: FAIL
because file does not exist

**Step 3: Write minimal implementation**

Create `useRuntimePreview` that manages:

- `previewUrl`
- `previewState: 'idle' | 'building' | 'running' | 'failed'`
- `isPreviewOpen`
- `openPreview`
- `closePreview`

Do not solve full runtime discovery yet. Start with explicit setter support so
the shell can stop pretending preview is always there.

**Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test ./hooks/useRuntimePreview.test.ts` Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/hooks/useRuntimePreview.ts apps/web/hooks/useRuntimePreview.test.ts apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx
git commit -m "feat: add runtime preview state model for contextual preview"
```

---

### Task 10: Add Contextual Split Preview To Workbench

**Files:**

- Modify: `apps/web/components/workbench/Workbench.tsx`
- Modify: `apps/web/components/preview/PreviewPanel.tsx`
- Test: `apps/web/components/workbench/workbench.preview-layout.test.tsx`

**Step 1: Write the failing test**

```tsx
// apps/web/components/workbench/workbench.preview-layout.test.tsx
import { describe, expect, test } from 'bun:test'

describe('Workbench preview layout', () => {
  test('supports contextual preview without permanent sidebar preview destination', async () => {
    const mod = await import('./Workbench')
    expect(mod.Workbench).toBeDefined()
  })
})
```

**Step 2: Run test to verify baseline**

Run:
`cd apps/web && bun test ./components/workbench/workbench.preview-layout.test.tsx`
Expected: PASS

**Step 3: Write minimal implementation**

Add a contextual preview mode to `Workbench`:

- only render `PreviewPanel` when `isPreviewOpen` and `previewUrl` exist
- render as temporary split beside editor or overlay from workspace
- remove sidebar `builder`/preview branch entirely

**Step 4: Verify**

Run:

```bash
cd apps/web && bun test ./components/workbench/workbench.preview-layout.test.tsx
cd apps/web && npx tsc --noEmit --pretty false
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/components/workbench/Workbench.tsx apps/web/components/preview/PreviewPanel.tsx apps/web/components/workbench/workbench.preview-layout.test.tsx
git commit -m "feat: add contextual workbench preview and remove permanent preview destination"
```

---

## Phase 5: Final Integration And Verification

### Task 11: Wire Artifact / Review CTAs To Real Destinations

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Modify: `apps/web/components/chat/RunProgressPanel.tsx`
- Modify: `apps/web/components/workbench/PendingArtifactOverlay.tsx`

**Step 1: Replace no-op handlers**

Ensure `onOpenArtifacts` and related review actions:

- open the Review surface
- switch to `artifacts` or `run` tab appropriately

**Step 2: Verify**

Run: `cd apps/web && npx tsc --noEmit --pretty false` Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx apps/web/components/chat/RunProgressPanel.tsx apps/web/components/workbench/PendingArtifactOverlay.tsx
git commit -m "fix: wire artifact and review CTAs to real review destinations"
```

---

### Task 12: Full Verification Pass

**Step 1: TypeScript compilation**

Run: `bun run typecheck` Expected: PASS

**Step 2: Lint**

Run: `bun run lint` Expected: PASS

**Step 3: Formatting**

Run: `bun run format:check` Expected: PASS

**Step 4: Web test suite**

Run: `cd apps/web && bun test app components hooks lib` Expected: PASS

**Step 5: Manual browser verification**

Checklist:

1. Desktop opens with editor/workbench visually dominant.
2. Right rail shows chat only, not permanent preview.
3. Preview is only available when runtime preview state is valid.
4. Review surface opens for runs, plans, artifacts, memory, and evals.
5. New Chat is accessible without a sidebar rail destination.
6. Sidebar no longer contains duplicate preview destination.
7. Mobile bottom navigation reads Work / Chat / Review.
8. Artifact and run “open” actions navigate to real destinations.

**Step 6: Commit final fixups**

```bash
git add -A
git commit -m "refactor: implement editor-first Panda workspace layout strategy"
```
