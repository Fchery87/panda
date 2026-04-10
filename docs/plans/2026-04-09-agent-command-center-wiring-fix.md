# Agent Command Center Wiring Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Fix all broken wiring in the Agent Command Center UI so that chat is
accessible, buttons work, and the bottom dock renders correctly.

**Architecture:** The redesign created 12+ well-built components but failed to
wire state transitions between them. The page (`page.tsx`) manages all state via
`useProjectWorkspaceUi()` but never exposes controls to toggle the right panel
(chat), the "New Task" button creates chats silently, and the bottom dock uses
`<Panel>` outside a `<PanelGroup>`. All fixes are in the glue layer — no
component internals change.

**Tech Stack:** Next.js App Router, React 18, react-resizable-panels,
react-hotkeys-hook, framer-motion, Phosphor Icons

---

### Task 1: Add Chat Toggle Button to TopBarControls

**Files:**

- Modify: `apps/web/components/layout/TopBarControls.tsx:21-31` (props
  interface)
- Modify: `apps/web/components/layout/TopBarControls.tsx:53-148` (component
  body)

**Step 1: Add new props to the interface**

In `TopBarControls.tsx`, add two new props to `TopBarControlsProps` (line
21-31):

```tsx
interface TopBarControlsProps {
  branch?: string
  model?: string
  runMode?: RunMode
  onRunModeChange?: (mode: RunMode) => void
  healthStatus?: HealthStatus
  onNewTask?: () => void
  isAgentRunning?: boolean
  notificationCount?: number
  onNotificationsClick?: () => void
  // NEW:
  onToggleRightPanel?: () => void
  isRightPanelOpen?: boolean
}
```

**Step 2: Add the chat toggle button**

In `TopBarControls.tsx`, destructure the new props and add a chat toggle button
between the notifications bell and the "New Task" button. The button uses the
existing `IconNewChat` icon from `@/components/ui/icons`.

Add `IconNewChat` to the import on line 4-8:

```tsx
import {
  IconGit,
  IconBell,
  IconQuickAction,
  IconSpinner,
  IconNewChat,
} from '@/components/ui/icons'
```

Destructure new props in the component signature (line 53-63):

```tsx
export function TopBarControls({
  branch,
  model,
  runMode = 'local',
  onRunModeChange,
  healthStatus = 'ready',
  onNewTask,
  isAgentRunning = false,
  notificationCount = 0,
  onNotificationsClick,
  onToggleRightPanel,
  isRightPanelOpen = false,
}: TopBarControlsProps) {
```

Insert the chat toggle button right before the "New Task" button (before line
140):

```tsx
{
  /* Chat panel toggle */
}
;<button
  type="button"
  onClick={onToggleRightPanel}
  className={cn(
    'flex h-7 w-7 items-center justify-center transition-colors',
    isRightPanelOpen
      ? 'text-foreground bg-surface-2'
      : 'text-muted-foreground hover:text-foreground'
  )}
  title={isRightPanelOpen ? 'Close chat (Cmd+L)' : 'Open chat (Cmd+L)'}
  aria-label={isRightPanelOpen ? 'Close chat panel' : 'Open chat panel'}
  aria-pressed={isRightPanelOpen}
>
  <IconNewChat className="h-4 w-4" />
</button>
```

**Step 3: Run existing test to verify no regressions**

Run: `bun test apps/web/components/layout/ --no-coverage 2>&1 | head -30`
Expected: No test files exist here yet, so no failures.

**Step 4: Commit**

```bash
git add apps/web/components/layout/TopBarControls.tsx
git commit -m "feat: add chat toggle button to TopBarControls"
```

---

### Task 2: Wire Chat Toggle + Keyboard Shortcut in page.tsx

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx:271-279` (add
  shortcut)
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx:1467-1473`
  (pass new props)

**Step 1: Add Cmd+L keyboard shortcut**

In `page.tsx`, after the existing `ctrl+j` hotkey block (line 271-279), add:

```tsx
// Toggle right panel (chat) with Cmd+L
useHotkeys(
  'mod+l',
  (e) => {
    e.preventDefault()
    setIsRightPanelOpen((prev) => !prev)
  },
  { enableOnFormTags: ['INPUT', 'TEXTAREA'] }
)
```

**Step 2: Pass new props to TopBarControls**

In `page.tsx`, update the `<TopBarControls>` call (around line 1468-1473).
Change from:

```tsx
<TopBarControls
  model={selectedModel}
  isAgentRunning={agent.isLoading}
  onNewTask={handleNewChat}
  healthStatus={isAnyJobRunning ? 'ready' : 'ready'}
/>
```

To:

```tsx
<TopBarControls
  model={selectedModel}
  isAgentRunning={agent.isLoading}
  onNewTask={handleNewChat}
  healthStatus={isAnyJobRunning ? 'ready' : 'ready'}
  onToggleRightPanel={() => setIsRightPanelOpen((prev) => !prev)}
  isRightPanelOpen={isRightPanelOpen}
/>
```

**Step 3: Verify the app compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | tail -20` Expected: No new
errors related to TopBarControls.

**Step 4: Commit**

```bash
git add apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx
git commit -m "feat: wire Cmd+L shortcut and chat toggle to right panel"
```

---

### Task 3: Make "New Task" Open the Right Panel

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx:813-816`
  (handleNewChat)

**Step 1: Update handleNewChat to also open the right panel**

In `page.tsx`, change `handleNewChat` (line 813-816) from:

```tsx
const handleNewChat = useCallback(async () => {
  const id = await createChatMutation({
    projectId,
    title: 'New Chat',
    mode: chatMode,
  })
  setActiveChatId(id)
}, [createChatMutation, projectId, chatMode, setActiveChatId])
```

To:

```tsx
const handleNewChat = useCallback(async () => {
  const id = await createChatMutation({
    projectId,
    title: 'New Chat',
    mode: chatMode,
  })
  setActiveChatId(id)
  setIsRightPanelOpen(true)
  setRightPanelTab('chat')
}, [
  createChatMutation,
  projectId,
  chatMode,
  setActiveChatId,
  setIsRightPanelOpen,
  setRightPanelTab,
])
```

**Step 2: Commit**

```bash
git add apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx
git commit -m "feat: New Task button now opens chat panel"
```

---

### Task 4: Fix Contextual Chat to Use Right Panel State

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx:1541-1551`
  (onContextualChat handler)

**Step 1: Replace dead `setIsChatPanelOpen` with `setIsRightPanelOpen`**

In `page.tsx`, change the `onContextualChat` handler (line 1541-1551) from:

```tsx
          onContextualChat={(selection, filePath) => {
            const ext = filePath.split('.').pop() || 'text'
            const prompt = `\`\`\`${ext}\n// ${filePath}\n${selection}\n\`\`\``
            setContextualPrompt(prompt)
            if (!isChatPanelOpen) {
              setIsChatPanelOpen(true)
            }
            if (isMobileLayout) {
              setMobilePrimaryPanel('chat')
            }
          }}
```

To:

```tsx
          onContextualChat={(selection, filePath) => {
            const ext = filePath.split('.').pop() || 'text'
            const prompt = `\`\`\`${ext}\n// ${filePath}\n${selection}\n\`\`\``
            setContextualPrompt(prompt)
            if (!isRightPanelOpen) {
              setIsRightPanelOpen(true)
            }
            setRightPanelTab('chat')
            if (isMobileLayout) {
              setMobilePrimaryPanel('chat')
            }
          }}
```

**Step 2: Commit**

```bash
git add apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx
git commit -m "fix: contextual chat now opens right panel instead of dead isChatPanelOpen"
```

---

### Task 5: Fix Bottom Dock — Wrap in Vertical PanelGroup

**Files:**

- Modify: `apps/web/components/projects/ProjectWorkspaceLayout.tsx:267-391`
  (desktop layout section)

**Step 1: Restructure the desktop layout**

The current structure has `<Panel>` (line 348) outside any `<PanelGroup>`.
Replace the entire desktop layout block (lines 267-391) with a properly nested
vertical `<PanelGroup>` wrapping the upper content and the dock.

Replace the desktop block (starting at
`{/* Desktop: Three-zone + dock layout */}`) with:

```tsx
/* Desktop: Three-zone + dock layout */
;<PanelGroup
  direction="vertical"
  className="flex h-full min-h-0 min-w-0 flex-col"
  autoSaveId="panda-workspace-vertical"
>
  {/* Upper area: Center + Right panel */}
  <Panel
    id="upper-area"
    order={1}
    defaultSize={isBottomDockOpen ? 72 : 100}
    minSize={40}
  >
    <PanelGroup
      key={`layout-${isRightPanelOpen ? 'right-open' : 'right-closed'}`}
      direction="horizontal"
      className="h-full min-h-0 min-w-0"
      autoSaveId={`panda-workspace-${isRightPanelOpen ? 'right-open' : 'right-closed'}`}
    >
      {/* Review panel - left side when open */}
      {isReviewPanelOpen && (
        <>
          <Panel
            id="review-panel"
            order={1}
            defaultSize={24}
            minSize={20}
            maxSize={35}
            className="flex min-h-0 min-w-0 flex-col"
          >
            <div className="bg-background flex h-full min-h-0 min-w-0 flex-col">
              <div className="surface-1 border-border flex min-h-9 items-center justify-between border-b px-3 font-mono text-[10px] tracking-[0.18em] uppercase">
                <span className="text-foreground">Review</span>
                <button
                  onClick={() => onReviewPanelOpenChange(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                {reviewPanel}
              </div>
            </div>
          </Panel>
          <PanelResizeHandle className="bg-border hover:bg-primary h-full w-px transition-colors" />
        </>
      )}

      {/* Center workspace - dominant panel */}
      <Panel
        id="workspace-panel"
        order={2}
        defaultSize={isRightPanelOpen ? 50 : isReviewPanelOpen ? 76 : 100}
        minSize={35}
        className="flex min-h-0 min-w-0 flex-col"
      >
        {workbench}
      </Panel>

      {/* Right context panel - chat + context */}
      {isRightPanelOpen && (
        <>
          <PanelResizeHandle className="bg-border hover:bg-primary h-full w-px transition-colors" />
          <Panel
            id="right-context-panel"
            order={3}
            defaultSize={isCompactDesktopLayout ? 32 : 26}
            minSize={22}
            maxSize={40}
            className="flex min-h-0 min-w-0 flex-col"
          >
            <RightPanel
              chatContent={chatPanel}
              activeTab={rightPanelTab}
              onTabChange={onRightPanelTabChange}
            />
          </Panel>
        </>
      )}
    </PanelGroup>
  </Panel>

  {/* Bottom Dock */}
  {isBottomDockOpen && (
    <>
      <PanelResizeHandle className="bg-border hover:bg-primary h-px w-full transition-colors" />
      <Panel
        id="bottom-dock-panel"
        order={2}
        defaultSize={28}
        minSize={15}
        maxSize={60}
        className="min-h-0 min-w-0"
      >
        <BottomDock
          isOpen={true}
          activeTab={activeBottomDockTab}
          onTabChange={(tab) => onBottomDockTabChange?.(tab)}
          onToggle={() => onBottomDockOpenChange?.(false)}
          tabs={dockTabs}
        >
          {activeBottomDockTab === 'terminal' && (
            <Terminal projectId={projectId} />
          )}
          {activeBottomDockTab === 'problems' && (
            <div className="text-muted-foreground flex h-full items-center justify-center font-mono text-xs">
              No problems detected
            </div>
          )}
          {activeBottomDockTab === 'agent-events' && <AgentEventsPanel />}
          {activeBottomDockTab === 'logs' && (
            <div className="text-muted-foreground flex h-full items-center justify-center font-mono text-xs">
              No logs
            </div>
          )}
          {activeBottomDockTab === 'build' && (
            <div className="text-muted-foreground flex h-full items-center justify-center font-mono text-xs">
              No build output
            </div>
          )}
        </BottomDock>
      </Panel>
    </>
  )}
</PanelGroup>
{
  /* Collapsed dock bar (outside PanelGroup since it's not resizable) */
}
{
  !isBottomDockOpen && (
    <BottomDock
      isOpen={false}
      activeTab={activeBottomDockTab}
      onTabChange={(tab) => {
        onBottomDockTabChange?.(tab)
        onBottomDockOpenChange?.(true)
      }}
      onToggle={() => onBottomDockOpenChange?.(true)}
      tabs={dockTabs}
    >
      {null}
    </BottomDock>
  )
}
```

**Step 2: Remove the dead `effectiveRightPanelOpen` fallback**

In the same file, remove the line (around line 150):

```tsx
const effectiveRightPanelOpen = isRightPanelOpen ?? isChatPanelOpen
```

Since `isRightPanelOpen` is now the sole source of truth, all references to
`effectiveRightPanelOpen` become `isRightPanelOpen`.

**Step 3: Remove dead `chatInput` prop from the `<RightPanel>` call**

In the same file, change:

```tsx
<RightPanel
  chatContent={chatPanel}
  chatInput={null}
  activeTab={rightPanelTab}
  onTabChange={onRightPanelTabChange}
/>
```

To:

```tsx
<RightPanel
  chatContent={chatPanel}
  activeTab={rightPanelTab}
  onTabChange={onRightPanelTabChange}
/>
```

**Step 4: Run the existing layout test**

Run:
`bun test apps/web/components/projects/project-workspace-layout.test.tsx --no-coverage 2>&1 | tail -20`
Expected: The test may need `isRightPanelOpen` added. If it fails, update the
test to pass `isRightPanelOpen={true}` instead of relying on `isChatPanelOpen`.

**Step 5: Commit**

```bash
git add apps/web/components/projects/ProjectWorkspaceLayout.tsx
git commit -m "fix: bottom dock now properly nested in vertical PanelGroup, remove dead effectiveRightPanelOpen"
```

---

### Task 6: Remove Dead chatInput Prop from RightPanel

**Files:**

- Modify: `apps/web/components/panels/RightPanel.tsx:23-33` (interface)
- Modify: `apps/web/components/panels/RightPanel.tsx:40-50` (destructuring)
- Modify: `apps/web/components/panels/RightPanel.test.tsx` (test)

**Step 1: Remove chatInput from the interface and component**

In `RightPanel.tsx`, remove `chatInput` from the interface (line 25):

```tsx
// REMOVE this line:
chatInput: ReactNode
```

Remove `chatInput: _chatInput,` from the destructuring (line 42):

```tsx
// REMOVE this line:
  chatInput: _chatInput,
```

**Step 2: Update the test**

In `RightPanel.test.tsx`, change:

```tsx
test('renders chat content and input without preview tabs', () => {
  const html = renderToStaticMarkup(
    <RightPanel chatContent={<div>chat</div>} chatInput={<div>input</div>} />
  )

  expect(html).toContain('chat')
  expect(html).not.toContain('input')
  expect(html).not.toContain('Preview')
})
```

To:

```tsx
test('renders chat content without preview tabs', () => {
  const html = renderToStaticMarkup(
    <RightPanel chatContent={<div>chat</div>} />
  )

  expect(html).toContain('chat')
  expect(html).not.toContain('Preview')
})
```

**Step 3: Run the test**

Run:
`bun test apps/web/components/panels/RightPanel.test.tsx --no-coverage 2>&1`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/components/panels/RightPanel.tsx apps/web/components/panels/RightPanel.test.tsx
git commit -m "refactor: remove dead chatInput prop from RightPanel"
```

---

### Task 7: Wire WorkspaceHome "Start Agent" to Open Chat

**Files:**

- Modify: `apps/web/components/workbench/Workbench.tsx:31-67` (add prop to
  interface)
- Modify: `apps/web/components/workbench/Workbench.tsx:80-103` (destructure
  prop)
- Modify: `apps/web/components/workbench/Workbench.tsx:187-197` (mobile
  WorkspaceHome)
- Modify: `apps/web/components/workbench/Workbench.tsx:396-406` (desktop
  WorkspaceHome)
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx:1506-1604`
  (pass prop)

**Step 1: Add `onStartAgent` prop to WorkbenchProps**

In `Workbench.tsx`, add to the `WorkbenchProps` interface (after line 66):

```tsx
  /** Called when user wants to start a new agent task (e.g. from WorkspaceHome) */
  onStartAgent?: () => void
```

**Step 2: Destructure the new prop**

In the component signature (around line 80-103), add `onStartAgent` to the
destructuring:

```tsx
  onStartAgent,
```

**Step 3: Wire to all WorkspaceHome instances**

Replace the no-op `onStartAgent` callbacks. In the mobile WorkspaceHome (around
line 193):

```tsx
<WorkspaceHome
  recentFiles={recentFiles}
  pendingDiffs={pendingDiffCount}
  activeAgents={isAgentRunning ? 1 : 0}
  onOpenFile={onSelectFile}
  onStartAgent={onStartAgent}
/>
```

In the desktop WorkspaceHome (around line 396-406):

```tsx
<WorkspaceHome
  recentFiles={recentFiles}
  pendingDiffs={pendingDiffCount}
  activeAgents={isAgentRunning ? 1 : 0}
  problemCount={0}
  onOpenFile={onSelectFile}
  onOpenDiffView={() => onCenterTabChange?.('diff')}
  onStartAgent={onStartAgent}
/>
```

Also update the editor-fallback WorkspaceHome (around line 438-445):

```tsx
<WorkspaceHome
  recentFiles={recentFiles}
  pendingDiffs={pendingDiffCount}
  activeAgents={isAgentRunning ? 1 : 0}
  onOpenFile={onSelectFile}
  onOpenDiffView={() => onCenterTabChange?.('diff')}
  onStartAgent={onStartAgent}
/>
```

**Step 4: Pass the handler from page.tsx**

In `page.tsx`, in the `<ProjectWorkspaceLayout>` call, the Workbench is
instantiated inside `ProjectWorkspaceLayout`. Since `ProjectWorkspaceLayout`
creates the `<Workbench>` internally, we need to pass `onStartAgent` through
`ProjectWorkspaceLayout`.

Add `onStartAgent` to `ProjectWorkspaceLayoutProps`:

```tsx
  onStartAgent?: () => void
```

Destructure it in `ProjectWorkspaceLayout` and pass to `<Workbench>`:

```tsx
onStartAgent = { onStartAgent }
```

Then in `page.tsx`, add the prop to the `<ProjectWorkspaceLayout>` call:

```tsx
          onStartAgent={() => {
            setIsRightPanelOpen(true)
            setRightPanelTab('chat')
          }}
```

**Step 5: Commit**

```bash
git add apps/web/components/workbench/Workbench.tsx apps/web/components/projects/ProjectWorkspaceLayout.tsx apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx
git commit -m "feat: wire WorkspaceHome Start Agent to open chat panel"
```

---

### Task 8: Update Existing Tests + Final Verification

**Files:**

- Modify: `apps/web/components/projects/project-workspace-layout.test.tsx`

**Step 1: Update layout test to use `isRightPanelOpen` instead of
`isChatPanelOpen`**

In `project-workspace-layout.test.tsx`, update the test to pass
`isRightPanelOpen={true}` and verify chat renders:

```tsx
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
        reviewPanel={<div>review-panel</div>}
        isReviewPanelOpen={false}
        onReviewPanelOpenChange={() => {}}
        isChatPanelOpen={true}
        isRightPanelOpen={true}
        chatMode="code"
        onModeChange={() => {}}
        cursorPosition={null}
        isStreaming={false}
        currentSpec={null}
        isSpecDrawerOpen={false}
        onSpecDrawerOpenChange={() => {}}
        onApplyPendingArtifact={() => {}}
        onRejectPendingArtifact={() => {}}
      />
    )

    expect(html).toContain('chat-panel')
    expect(html).not.toContain('Preview')
  })
})
```

**Step 2: Run all affected tests**

Run:
`bun test apps/web/components/panels/RightPanel.test.tsx apps/web/components/projects/project-workspace-layout.test.tsx --no-coverage 2>&1`
Expected: All PASS

**Step 3: Run TypeScript compilation**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | tail -30` Expected: No
errors

**Step 4: Commit**

```bash
git add apps/web/components/projects/project-workspace-layout.test.tsx
git commit -m "test: update layout tests for right panel wiring changes"
```

---

## Summary of Changes

| #   | What                                     | Why                                                            |
| --- | ---------------------------------------- | -------------------------------------------------------------- |
| 1   | Chat toggle button in TopBarControls     | Users need a visible way to open/close chat                    |
| 2   | Cmd+L shortcut + prop wiring in page.tsx | Keyboard-first users need a shortcut                           |
| 3   | handleNewChat opens right panel          | "New Task" should show the chat UI                             |
| 4   | Contextual chat uses isRightPanelOpen    | Old `isChatPanelOpen` is dead state                            |
| 5   | Vertical PanelGroup for bottom dock      | `<Panel>` outside `<PanelGroup>` breaks react-resizable-panels |
| 6   | Remove dead chatInput prop               | Dead code cleanup                                              |
| 7   | Wire WorkspaceHome "Start Agent"         | No-op button is confusing                                      |
| 8   | Update tests                             | Keep tests passing after interface changes                     |

## Verification Checklist

After all tasks complete:

1. Open project workspace — right panel closed by default
2. Press **Cmd+L** — right panel opens showing Chat tab
3. Click **chat toggle button** in top bar — right panel toggles
4. Click **"New Task"** — creates chat AND opens right panel
5. Select text in editor, use **contextual chat** — right panel opens to Chat
   tab
6. Click **"Start Agent"** on WorkspaceHome — right panel opens to Chat tab
7. Press **Ctrl+J** — bottom dock opens, is resizable via drag handle
8. Drag the **dock resize handle** — dock resizes smoothly
9. Click **dock collapse** (▼) — shows slim collapsed bar
10. Click each **sidebar rail button** — flyout opens with correct pane
11. Run `bun test apps/web/components/ --no-coverage` — all pass
12. Run `npx tsc --noEmit` — no errors
