# Antigravity-Inspired UI Refresh Design

> **Status:** Design doc — not yet planned for implementation **Inspired by:**
> Google Antigravity Workbench IDE **Scope:** Visual polish + information
> hierarchy improvements across Panda's workbench

---

## Design Philosophy

Panda has more features than Antigravity (Inspector, SpecNative, Permissions,
Terminal), but Antigravity feels calmer and more focused. The core issue is
**information density and visual hierarchy** — Panda surfaces too many controls
in the default state.

**Principles:**

1. Reduce visual noise in the default/idle state
2. Surface controls only when contextually relevant
3. Add persistent awareness of agent activity (Activity Feed, Status Bar)
4. Establish visual identity through Phosphor duotone icons

**New dependency:** `@phosphor-icons/react` (replaces Lucide icons globally)

---

## Scope Classification

This design contains two categories of work. Mixing them up will cause
underestimation.

### Pure Visual Changes (no new data contracts)

- Icon system swap (Phosphor duotone)
- Chat header simplification (rearranging existing elements)
- File tab language-colored underlines
- Breadcrumb separator + icon swap
- Status bar connection text removal
- Options popover elimination (promoting existing controls inline)

### Changes Requiring Backend/Query/State Plumbing

- Activity Feed (new Convex query, new data shape)
- Agent Manager Drawer (new Convex query, cross-panel state)
- Status bar model badge + agent status (new props threaded through layout)
- Explorer Outline (symbol extraction, editor line-jump contract)
- Explorer Timeline (new file-scoped component, NOT reuse of existing Timeline)
- Breadcrumb clickable folders (new "reveal path" action in Explorer)

Each section below explicitly marks which category it falls into.

---

## 1. Chat Panel Redesign

**File:** `components/projects/ProjectChatPanel.tsx`

### 1a. Header — Minimal Branding

**Category:** Pure visual change

**Current:** Bot icon + "Chat" label + streaming dot + New Chat + Review +
Preview buttons + dropdown menu.

**Proposed:**

- Display project name or "panda" branding text (larger, confident)
- Move New Chat, Review, Preview into a single `...` (DotsThreeOutline) overflow
  menu
- Replace streaming dot with a thin pulsing accent line under the header (2px,
  primary color, CSS animation)
- Net: header goes from ~6 interactive elements to 2 (branding + overflow)

```
┌─────────────────────────────────┐
│  panda              ···         │
│  ━━━━━━━ (streaming accent)     │
└─────────────────────────────────┘
```

### 1b. ChatInput — Inline Single-Row Controls

**Category:** Pure visual change (rearranging existing controls)

**File:** `components/chat/ChatInput.tsx`

**Current:** Textarea with absolute-positioned send/enhance buttons inside, then
a second row: AttachmentButton + AgentSelector + Options popover + hint text.
Model, Variant, Brainstorm, Spec Tier are all hidden inside the Options popover.

**Proposed:**

- Textarea remains (auto-resize, @-mention, placeholder: "Ask anything, @ to
  mention, / for workflows")
- Send button moves from inside textarea to the inline control row
- Enhance button stays inside textarea (contextual — only appears when text
  exists)
- Below textarea, one compact row:

```
┌─────────────────────────────────────────────┐
│  Ask anything, @ to mention, / for workflows│
│                                    ✨       │
├─────────────────────────────────────────────┤
│  +  │ Code ▾ │ Claude Sonnet 4.5 ▾ │  ↑    │
└─────────────────────────────────────────────┘
```

- `+` — Attachments (Phosphor `Plus` icon, replaces AttachmentButton)
- Mode selector — AgentSelector, kept as-is but with Phosphor icon
- Model selector — **promoted from Options popover to inline**. Shows model
  name, compact dropdown on click
- Variant selector — appears inline only when current model supports reasoning
  (contextual show/hide)
- Send button — Phosphor `PaperPlaneRight` fill (replaces ArrowUp)

**Removed:**

- Options popover — eliminated entirely
- Spec Tier selector — moves to contextual: only appears inline when spec engine
  detects a non-instant task
- Brainstorm toggle — moves to a subtle toggle inside AgentSelector dropdown
  when mode=architect
- Hint text ("@ file · Enter to send") — remove; the placeholder text handles
  this
- ~~Mic button~~ — **Deferred.** Adding a stub mic button contradicts the
  "reduce default-state noise" principle. Voice input should be added when the
  backend supports it, not as a placeholder icon.

### 1c. Activity Feed — New Component

**Category:** Requires new Convex query + data shape

**File:** `components/chat/ActivityFeed.tsx` (new)

**Visible when:** Chat is empty (no messages) or agent is idle. Hides during
active conversation to maximize message area.

**Content:**

- 3-5 most recent agent runs across the project
- Each item shows:
  - Task summary (from `agentRuns.userMessage` or `agentRuns.summary`, truncated
    to ~60 chars)
  - Relative timestamp ("2h", "1d", "3d") derived from `agentRuns.startedAt`
  - Status icon: checkmark (completed), X (failed), spinner (running)
  - Mode badge (code/architect/memory)
- "See all" link at bottom → opens History sidebar section

```
┌─────────────────────────────────┐
│                                 │
│  (empty chat area)              │
│                                 │
├─────────────────────────────────┤
│  Implementing Cursor Parity  1d │
│  Refining IDE Workspace      1d │
│  Auditing Chat Panel Arch    2d │
│                                 │
│  See all                        │
├─────────────────────────────────┤
│  [input area]                   │
└─────────────────────────────────┘
```

#### Required Backend Work

The existing `api.chats.list` returns chat rows (title, mode, timestamps) but
NOT first-message content or run status. The existing `api.agentRuns.listByChat`
is per-chat only.

**New Convex query needed:** `api.agentRuns.listRecentByProject`

```typescript
// convex/agentRuns.ts — new query
export const listRecentByProject = query({
  args: { projectId: v.id('projects'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { project } = await requireProjectOwner(ctx, args.projectId)
    return await ctx.db
      .query('agentRuns')
      .withIndex('by_project_started', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(args.limit ?? 5)
  },
})
```

This works because `agentRuns` already has:

- `userMessage` (first user prompt), `summary`, `mode`, `model`, `status`,
  `startedAt`, `completedAt`
- Index: `by_project_started` on `['projectId', 'startedAt']`

No schema changes needed. The existing `agentRuns` row shape already contains
all fields the Activity Feed needs. The sidebar History section should also
adopt this query (with a higher limit) to gain timestamps and run status it
currently lacks.

---

## 2. Status Bar Enhancement

**Category:** Requires new props threaded through layout

**File:** `components/workbench/StatusBar.tsx`

### Current

```
FileIcon filename | Ln X, Col Y | Language        SpecBadge | GitBranch | Wifi Connected
```

### Proposed

```
FileIcon filename | Ln X, Col Y | Language | UTF-8    SpecBadge | Claude Sonnet 4.5 | Agent: idle | GitBranch | 🟢
```

**Left section changes:**

- Add encoding display ("UTF-8") — minor VS Code parity (pure visual)

**Right section changes:**

- **Add: Active model badge** — shows current model name as compact text.
  Provides persistent context.
- **Add: Agent status indicator** — "Agent: running" (with spinner) / "Agent:
  idle". Click to focus chat panel.
- **Simplify connection:** Icon-only when connected (green dot). Full
  "Disconnected" text + red icon only on disconnect.

#### Required State Plumbing

The current `StatusBarProps` interface accepts only: `filePath`,
`cursorPosition`, `language`, `branch`, `isConnected`, `isStreaming`,
`specEngineEnabled`, `specStatus`, `specConstraintsMet`, `specConstraintsTotal`,
`onSpecClick`.

**New props needed:**

```typescript
interface StatusBarProps {
  // ... existing props ...
  /** Currently active model display name */
  activeModel?: string
  /** Agent run status for persistent indicator */
  agentStatus?: 'idle' | 'running' | 'completed' | 'failed'
  /** Callback when agent status badge is clicked (focus chat panel) */
  onAgentStatusClick?: () => void
}
```

**Threading path:** These values must be passed from `ProjectWorkspaceLayout`
(which receives `isStreaming` already) down to `StatusBar`. The `model` value is
currently only in `useAgent` hook state → needs to be lifted to the layout level
or passed as a prop through `ProjectChatPanel` → layout → `StatusBar`.

The `agentStatus` can be derived from existing `isStreaming` + last run status,
but the model name requires an explicit prop chain that doesn't exist today:

- `useAgent` (holds `model`) → `page.tsx` → `ProjectWorkspaceLayout` →
  `StatusBar`

This is ~4 files of prop threading, not a visual-only change.

---

## 3. Sidebar & Explorer Polish

### 3a. Explorer Collapsible Sections

**Files:** `components/sidebar/SidebarFlyout.tsx`, new
`components/sidebar/ExplorerOutline.tsx`

Add collapsible accordion sections at the bottom of the Explorer flyout (below
the file tree):

#### Outline Section

**Category:** Requires new state contract + editor integration

- Shows symbols/headings of the active file (functions, classes, exports)
- Parsed from file content (regex-based for now — extract `export function`,
  `export class`, `export const`, markdown headings)
- Click a symbol → jump to that line in editor
- Collapsed by default

**Required plumbing:**

1. **Active file content** must be accessible in the sidebar context. Currently,
   file content is loaded in `EditorContainer` and not shared with the sidebar.
   Options:
   - Pass `selectedFileContent` down through `Workbench` → `SidebarFlyout`
   - Use a shared context/store for the active file
2. **Symbol-to-line mapping** — the outline parser must return
   `{ name, kind, line }` tuples
3. **Editor line-jump action** — `onSelectFile` already supports
   `location?: { line, column }`, so this part works. The outline just needs to
   call `onSelectFile(currentPath, { line: symbol.line, column: 0 })`

#### Timeline Section — New Component Required

**Category:** Requires new component (NOT a reuse of existing Timeline.tsx)

The existing `components/workbench/Timeline.tsx` renders **agent run events**
from `api.agentRuns.listEventsByChat`. It has no file-path input and is a
completely different product surface.

**What's actually needed:** A `FileTimeline.tsx` component that shows recent
git-level changes for a specific file. This would need:

- A new Convex query or server action that runs
  `git log --oneline -n 10 -- <filepath>` (or equivalent from the project's
  version history)
- OR: derive from `agentRunEvents` where `targetFilePaths` includes the selected
  file (approximation, not true git history)

**Recommendation:** Defer this to a later phase. The Outline section is more
useful and doesn't require git integration. The "Timeline" accordion can be
added later when file-level history is available.

```
┌──────────────────────┐
│ ▸ src/               │
│   ▸ components/      │
│   ▸ lib/             │
│     ChatInput.tsx    │
│     ...              │
├──────────────────────┤
│ ▸ OUTLINE            │
└──────────────────────┘
```

### 3b. History Section — Timestamps

**Category:** Pure visual + query upgrade

Add relative timestamps ("2h", "1d") to sidebar History items. Adopt the same
`listRecentByProject` query from Section 1c (Activity Feed) with a higher limit,
so both surfaces share a data source and show consistent information.

---

## 4. Icon System — Phosphor Duotone

**Category:** Pure visual change

**Package:** `@phosphor-icons/react` **Weight:** `duotone` for
navigation/sidebar, `regular` for inline/small icons, `fill` for active states

### Icon Mapping

| Location         | Current (Lucide)    | Proposed (Phosphor)                        |
| ---------------- | ------------------- | ------------------------------------------ |
| **Sidebar Rail** |                     |                                            |
| Explorer         | `FolderTree`        | `TreeStructure` duotone                    |
| Search           | `Search`            | `MagnifyingGlass` duotone                  |
| History          | `Clock`             | `ClockCounterClockwise` duotone            |
| Specs            | `FileCheck`         | `CheckSquareOffset` duotone                |
| Git              | `GitBranch`         | `GitBranch` duotone                        |
| Terminal         | `TerminalSquare`    | `Terminal` duotone                         |
| Settings         | `Settings`          | `GearSix` duotone                          |
| Docs             | `BookOpen`          | `BookOpenText` duotone                     |
| **Chat Input**   |                     |                                            |
| Attach           | `Paperclip`         | `Plus` regular                             |
| Send             | `ArrowUp`           | `PaperPlaneRight` fill                     |
| Stop             | `Square`            | `Stop` fill                                |
| Enhance          | `Sparkles`          | `Sparkle` duotone                          |
| Revert           | `Undo2`             | `ArrowCounterClockwise` regular            |
| **Chat Header**  |                     |                                            |
| Bot              | `Bot`               | `Robot` duotone                            |
| Overflow         | `MoreHorizontal`    | `DotsThreeOutline` regular                 |
| New Chat         | `MessageSquarePlus` | `ChatCirclePlus` duotone                   |
| **Status Bar**   |                     |                                            |
| File             | `FileCode`          | `FileCode` duotone                         |
| Git              | `GitBranch`         | `GitBranch` regular                        |
| Connected        | `Wifi`              | `WifiHigh` regular (icon-only)             |
| Disconnected     | `WifiOff`           | `WifiSlash` regular + text                 |
| Streaming        | `Loader2`           | `CircleNotch` regular (animate-spin)       |
| **File Tabs**    |                     |                                            |
| TypeScript       | generic file icon   | `FileTs` duotone                           |
| JavaScript       | generic file icon   | `FileJs` duotone                           |
| JSON             | generic file icon   | `FileJson` duotone (custom if unavailable) |
| CSS              | generic file icon   | `FileCss` duotone                          |
| HTML             | generic file icon   | `FileHtml` duotone                         |
| Markdown         | generic file icon   | `FileText` duotone                         |
| Close tab        | `X`                 | `X` regular                                |
| Dirty indicator  | filled dot          | filled dot (keep)                          |
| **Breadcrumbs**  |                     |                                            |
| Separator        | `>` text            | `CaretRight` regular (12px)                |
| **Inspector**    |                     |                                            |
| Run tab          | varies              | `Play` duotone                             |
| Plan tab         | varies              | `ListChecks` duotone                       |
| Artifacts tab    | varies              | `Cube` duotone                             |
| Memory tab       | varies              | `Brain` duotone                            |
| Evals tab        | varies              | `ChartBar` duotone                         |

### Migration Strategy

- Install `@phosphor-icons/react`
- Create a `components/ui/icons.tsx` mapping file that re-exports Phosphor icons
  with Panda's standard sizes/weights, so the rest of the codebase imports from
  one place
- Migrate file-by-file, starting with sidebar (highest visual impact) → chat →
  status bar → tabs → breadcrumbs
- Remove `lucide-react` once fully migrated

---

## 5. Agent Manager Drawer

**Category:** Requires new Convex query + cross-panel state

**File:** `components/agent/AgentManagerDrawer.tsx` (new)

**Access:** Button in the FileTabs action strip area (right side of tab bar),
Phosphor `Robot` duotone icon. Also accessible via Cmd+Shift+A shortcut.

**Opens as:** Slide-over drawer from right (reuse SpecDrawer pattern with Framer
Motion).

**Scope:** Per-project. Shows runs across all chats in the project.

### Sections

**Active Run (top, always visible when a run exists):**

```
┌──────────────────────────────────┐
│ ACTIVE RUN                       │
│ ● Implementing auth flow    2:34 │
│   Code mode · Claude Sonnet 4.5  │
│   Step 4/7                       │
│                         [Stop]   │
└──────────────────────────────────┘
```

- Live status from RunProgressPanel data
- Model, mode, elapsed time, step count
- Stop button

**Recent Runs (scrollable list):**

```
┌──────────────────────────────────┐
│ RECENT RUNS                      │
│                                  │
│ ✓ Refining IDE layout       1d   │
│   Architect · Gemini Pro · 4:12  │
│                                  │
│ ✗ Fix auth redirect bug     2d   │
│   Code · Claude Sonnet · 1:45    │
│                                  │
│ ✓ Add dark mode support     3d   │
│   Code · Claude Sonnet · 8:23    │
└──────────────────────────────────┘
```

- Last 10 runs across all chats
- Task summary, mode, model, duration, status, timestamp
- Click → navigate to that chat

**Agent Profiles (collapsed accordion):**

```
┌──────────────────────────────────┐
│ ▸ AGENT PROFILES                 │
│   Code — general implementation  │
│   Architect — planning & design  │
│   Memory — context management    │
└──────────────────────────────────┘
```

- Lists available modes with descriptions
- Future: per-mode model routing config

#### Required Backend Work

**Recent Runs query:** Reuses the same `api.agentRuns.listRecentByProject` from
Section 1c, but with `limit: 10`. The `agentRuns` row already contains
`userMessage`, `summary`, `mode`, `model`, `status`, `startedAt`, `completedAt`
— all fields shown in the Recent Runs list.

**Active Run data:** This is the harder part. Today, active run data (step
count, elapsed time, live progress) lives in local React state within `useAgent`
hook on `page.tsx` (line ~651). It is NOT available as a Convex query because
progress steps are streamed from the harness runtime and only persisted to
`agentRunEvents` after the run completes.

**Options for Active Run section:**

1. **Lift local state** — Pass `liveProgressSteps`, `currentRunId`,
   `isStreaming` from `page.tsx` through layout → drawer. This is prop threading
   (~4 files) but no new backend work. The drawer reads the same local state
   that `RunProgressPanel` already consumes.
2. **Real-time run status in Convex** — Persist partial progress to `agentRuns`
   during execution (e.g., update `stepCount` field on each step). This gives
   the drawer reactive data but adds write pressure during runs. **Not
   recommended for v1.**

**Recommendation:** Option 1 for v1. The drawer shows live data from local
state, and historical data from the Convex query.

**"Files modified" count:** The original design showed "3 files modified" in the
active run. This requires counting distinct `targetFilePaths` from
`agentRunEvents` for the run, which means either:

- A separate aggregation query per run (expensive for a list of 10)
- Denormalizing a `filesModifiedCount` onto the `agentRuns` row at completion
  time

**Recommendation:** Drop "files modified" from v1. Show mode, model, duration,
status only. Add file counts later if there's demand.

---

## 6. Breadcrumb & File Tab Polish

### Breadcrumbs

**File:** `components/workbench/Breadcrumb.tsx`

**Pure visual part:**

- Add Phosphor duotone file icon before the filename segment
- Replace `>` separators with Phosphor `CaretRight` (12px, muted)

**Requires plumbing:**

- Make intermediate folder segments clickable → opens that folder in Explorer
  flyout

The current `Breadcrumb` component renders labels/links with no folder-path
awareness. The `BreadcrumbItem` type (`{ label, href? }`) doesn't carry a folder
path that could be used to reveal the Explorer at that location.

**Required contract:**

```typescript
interface BreadcrumbItem {
  label: string
  href?: string
  /** Folder path for Explorer reveal (new) */
  folderPath?: string
}

// New callback
onRevealInExplorer?: (folderPath: string) => void
```

The `onRevealInExplorer` action needs to:

1. Set the active sidebar section to 'explorer'
2. Open the flyout if closed
3. Expand the FileTree to the target folder

This requires `handleSectionChange` from `WorkspaceContext` + a new "expand to
path" method on `FileTree`. Scope: ~3 files.

### File Tabs

**File:** `components/workbench/FileTabs.tsx`

**Pure visual (no plumbing):**

- Replace generic file icons with language-specific Phosphor duotone icons
  (FileTs, FileJs, etc.)
- **Language-colored active underline:** Replace the single primary-color top
  border with a bottom underline colored by language:
  - TypeScript: `#3178c6` (blue)
  - JavaScript: `#f7df1e` (yellow)
  - JSON: `#a8a800` (olive)
  - CSS: `#663399` (purple)
  - HTML: `#e34c26` (orange)
  - Python: `#3776ab` (blue)
  - Markdown: `#888` (gray)
  - Default: primary color
- **Scroll arrows:** Add left/right chevron buttons at tab overflow edges
  (appear on hover when tabs overflow)

### Tab Row Action Strip

**Pure visual + minor plumbing:**

Add a right-aligned action area to the FileTabs row:

```
[tab1] [tab2] [tab3]          [🤖 Agents] [⚙ Settings]
```

- Agent Manager button: Phosphor `Robot` duotone → opens AgentManagerDrawer
- Settings shortcut: Phosphor `GearSix` duotone → navigates to project settings

Requires: `onOpenAgentManager` callback prop on `FileTabs`, threaded from
layout.

---

## 7. Implementation Phases (Revised)

Phases are now split by whether they require backend/state work or are pure
visual.

**Phase 1 — Icon System (pure visual, foundation)**

- Install Phosphor, create `ui/icons.tsx` mapping, migrate sidebar + chat +
  tabs + breadcrumbs
- Immediate visual impact, zero backend risk
- Estimated touch: ~15 files (icon imports only)

**Phase 2a — Chat Panel Visual Redesign (pure visual)**

- Header simplification (overflow menu)
- Inline controls (promote model selector, kill Options popover, remove hint
  text)
- No mic button stub
- Estimated touch: `ProjectChatPanel.tsx`, `ChatInput.tsx`

**Phase 2b — Activity Feed (requires backend)**

- New `api.agentRuns.listRecentByProject` query
- New `ActivityFeed.tsx` component
- Upgrade sidebar `SidebarHistoryPanel` to use same query + add timestamps
- Estimated touch: `convex/agentRuns.ts`, new component,
  `SidebarHistoryPanel.tsx`

**Phase 3a — File Tabs & Breadcrumb Visual Polish (pure visual)**

- Language-colored underlines, Phosphor file icons, scroll arrows
- Breadcrumb icon + separator swap
- Estimated touch: `FileTabs.tsx`, `Breadcrumb.tsx`

**Phase 3b — Status Bar + Breadcrumb Interactivity (requires state plumbing)**

- Thread `model` and `agentStatus` from `useAgent` → layout → `StatusBar`
- Breadcrumb clickable folders (requires Explorer "reveal path" action)
- Estimated touch: `StatusBar.tsx`, `ProjectWorkspaceLayout.tsx`, `page.tsx`,
  `Workbench.tsx`, `Breadcrumb.tsx`, `FileTree.tsx`

**Phase 4a — Explorer Outline (requires state plumbing)**

- New `ExplorerOutline.tsx` with regex symbol parser
- Thread active file content to sidebar context
- Wire symbol click → editor line jump
- Estimated touch: new component, `SidebarFlyout.tsx`, `Workbench.tsx`

**Phase 4b — Agent Manager Drawer (requires backend + state plumbing)**

- New `AgentManagerDrawer.tsx`
- Reuses `listRecentByProject` from Phase 2b
- Active run section via lifted local state (not new backend)
- Tab row action strip for drawer trigger
- Estimated touch: new component, `FileTabs.tsx`, `ProjectWorkspaceLayout.tsx`,
  `page.tsx`

**Deferred:**

- Explorer Timeline (file-scoped git history) — blocked on git integration,
  defer until file history API exists
- Mic button — add when voice input backend exists, not as a stub
- "Files modified" count in Agent Manager — add when `agentRuns` denormalizes
  file counts

---

## Component Inventory

| Component                 | Action                                                 | Category                     | New/Existing |
| ------------------------- | ------------------------------------------------------ | ---------------------------- | ------------ |
| `ProjectChatPanel.tsx`    | Simplify header                                        | Pure visual                  | Existing     |
| `ChatInput.tsx`           | Inline controls, remove Options popover                | Pure visual                  | Existing     |
| `ActivityFeed.tsx`        | Recent runs feed below input                           | Backend + UI                 | **New**      |
| `StatusBar.tsx`           | Model badge, agent status, icon-only connection        | State plumbing               | Existing     |
| `SidebarFlyout.tsx`       | Add Outline accordion                                  | State plumbing               | Existing     |
| `ExplorerOutline.tsx`     | File symbol outline panel                              | State plumbing               | **New**      |
| `AgentManagerDrawer.tsx`  | Agent orchestration drawer                             | Backend + state              | **New**      |
| `Breadcrumb.tsx`          | Phosphor icons (visual) + clickable folders (plumbing) | Mixed                        | Existing     |
| `FileTabs.tsx`            | Language colors, scroll arrows, action strip           | Pure visual + minor plumbing | Existing     |
| `SidebarRail.tsx`         | Phosphor icon swap                                     | Pure visual                  | Existing     |
| `SidebarHistoryPanel.tsx` | Adopt agentRuns query, add timestamps                  | Backend                      | Existing     |
| `ui/icons.tsx`            | Central Phosphor re-export mapping                     | Pure visual                  | **New**      |

### New Convex Queries

| Query                           | File                  | Purpose                                         |
| ------------------------------- | --------------------- | ----------------------------------------------- |
| `agentRuns.listRecentByProject` | `convex/agentRuns.ts` | Activity Feed + Agent Manager + History sidebar |

No schema changes required. The existing `agentRuns` table and
`by_project_started` index support this query.

### New Props / State Contracts

| Contract                   | From → To                                                             | Purpose                      |
| -------------------------- | --------------------------------------------------------------------- | ---------------------------- |
| `activeModel: string`      | `useAgent` → `page.tsx` → `ProjectWorkspaceLayout` → `StatusBar`      | Model badge in status bar    |
| `agentStatus`              | derived from `isStreaming` + run state → `StatusBar`                  | Agent status indicator       |
| `onAgentStatusClick`       | `StatusBar` → layout (focus chat panel)                               | Clickable agent badge        |
| `onRevealInExplorer(path)` | `Breadcrumb` → `Workbench` → `FileTree`                               | Breadcrumb folder navigation |
| `selectedFileContent`      | `EditorContainer` → `Workbench` → `SidebarFlyout` → `ExplorerOutline` | Outline symbol parsing       |
| `onOpenAgentManager`       | `FileTabs` → layout → drawer state                                    | Agent Manager trigger        |
| `liveProgressSteps`        | `useAgent` → layout → `AgentManagerDrawer`                            | Active run display           |

**New dependency:** `@phosphor-icons/react` **Removed dependency (eventual):**
`lucide-react`
