# Panda Layout Overhaul Design

**Date:** 2026-03-14 **Inspiration:** Blackbox.ai Web App & IDE **Goal:** Full
layout overhaul to make Panda's workbench feel polished, cohesive, and
feature-discoverable — while retaining Panda's identity (sharp/square aesthetic,
orange primary, Convex backend, agent harness).

---

## 1. Overall Layout Architecture

```
+--------------------------------------------------------------+
| Top Bar (h-14) - Logo, Sidebar Toggle, Breadcrumb, Actions   |
+------+---------------------------+---------------------------+
|      |                           |                           |
| Nav  |   Main Editor Area        |   Right Panel             |
| Rail |   (File tabs + Editor)    |   Tabs: [Chat] [Preview]  |
|  +   |                           |                           |
|Flyout|                           |   Chat: Messages, Run     |
|Panel |                           |   Progress, Inspector     |
|      |---------------------------+                           |
|(48px |   Terminal (collapsible)  |   Preview: Live iframe    |
| +    |                           |   + Artifacts sub-tab     |
|220px)|                           |                           |
+------+---------------------------+---------------------------+
| Status Bar (h-6) - File info, cursor, mode, connection       |
+--------------------------------------------------------------+
```

**Key principles:**

- Left sidebar evolves from 3-icon activity bar to dual-layer system (icon
  rail + flyout)
- Right panel unifies Chat and Preview/Artifacts into one tabbed panel
- Top bar gets cleaner (panel toggles removed, sidebar toggle added)
- All resizable via drag handles (react-resizable-panels, already in use)
- Mobile: bottom tab bar with 3 tabs (Workspace, Chat, Preview)

---

## 2. Dual-Layer Sidebar Navigation

### Icon Rail (always visible, 48px)

| Position | Icon (Lucide)       | Label    | Action                   |
| -------- | ------------------- | -------- | ------------------------ |
| Top      | Custom Panda SVG    | Logo     | Click -> projects list   |
| 1        | `MessageSquarePlus` | New Chat | Start fresh conversation |
| 2        | `FolderTree`        | Explorer | File tree panel          |
| 3        | `Search`            | Search   | Project search panel     |
| 4        | `Clock`             | History  | Session history panel    |
| 5        | `Eye`               | Builder  | Preview controls panel   |
| 6        | `FileCheck`         | Specs    | Spec panel               |
| 7        | `TerminalSquare`    | Terminal | Terminal sessions panel  |
| Bottom   | `Settings`          | Settings | Settings links           |
| Bottom   | `BookOpen`          | Docs     | Documentation links      |

### Flyout Panel (220px, toggleable)

- **Toggle behavior:** Same icon = toggle open/close. Different icon = switch
  content + auto-open.
- **State persisted** in localStorage (existing pattern).
- **Keyboard shortcut:** `Cmd+B` / `Ctrl+B` toggles flyout.
- **Animation:** 200ms ease-out slide.

### Flyout Content Per Section

- **New Chat:** Quick-start form with agent/model preselection, recent
  templates.
- **Explorer:** File tree (existing `FileTree.tsx`, relocated).
- **Search:** Project search (existing `ProjectSearchPanel.tsx`, relocated).
- **History:** Session list with "This Project / All Projects" toggle at top.
  Search bar, timestamps, summaries. Click to restore a session.
- **Builder:** Preview controls, future deploy options.
- **Specs:** Spec panel (existing, relocated).
- **Terminal:** Terminal session list, "New Terminal" button.
- **Settings:** Links to project settings (`/projects/[id]/settings`) and global
  settings (`/settings`).
- **Docs:** Links to Panda documentation and education page.

### Active State Styling

- Active icon: `surface-2` background pill + `primary` color tint.
- Inactive: `muted-foreground`, hover brightens to `foreground`.
- 150ms color transition on hover.

---

## 3. Unified Right Panel (Chat + Preview/Artifacts)

### Tab Structure

```
+-----------------------------+
| [Chat]  [Preview]    tabs   |
| [Manual] o--● [Auto] toggle |
+-----------------------------+
|                             |
|  Tab content area           |
|                             |
+-----------------------------+
| Chat Input (always visible) |
| [Paperclip] [input...] [^] |
| [Bot v] [BrainCircuit v]   |
+-----------------------------+
```

### Chat Tab

Retains all existing functionality:

- `MessageList` — scrollable message area with auto-scroll
- `MessageBubble` — user/assistant messages with markdown, code blocks, tool
  calls
- `RunProgressPanel` — live agent execution steps
- `ChatInspector` — drawer with Run/Plan/Memory/Evals tabs
- `ReasoningPanel` — collapsible model thinking
- `PermissionDialog` — inline approval for risky operations

### Preview Tab

Two sub-tabs:

- **Preview:** Live iframe rendering of generated frontend code. Auto-refreshes
  when artifacts are applied. Shows placeholder when no preview is available.
- **Artifacts:** Existing `ArtifactPanel` functionality —
  pending/applied/rejected artifacts with diffs and apply/reject buttons.

### Chat Input (Visible on Both Tabs)

- Input stays visible regardless of active tab — users can message while
  reviewing preview.
- **Attachment button** (`Paperclip` icon) opens popover:
  - `FilePlus2` Upload File
  - `ImagePlus` Upload Image
  - Or drag-and-drop directly onto input area
- **Attached items** show as:
  - Images: thumbnails above input
  - Files: chips with filename + remove button
- **Existing controls retained:**
  - Agent selector (`Bot` icon)
  - Model selector (`BrainCircuit` icon)
  - Variant selector (`SlidersHorizontal` icon)
  - Enhance button (`Sparkles` icon)
  - Send button (`ArrowUp` icon) / Stop button (`Square` icon, filled)
- **Spec tier selector** moves into Agent dropdown as sub-option (reduce
  clutter)

### Manual/Auto Mode Toggle

- Positioned in the right panel header, between tabs and content.
- Sliding pill animation (150ms) between Manual and Auto states.
- **Manual mode:** Agent requests approval before file writes and command
  execution.
- **Auto mode:** Agent executes autonomously (existing automation policy).
- Replaces the current "Automation Dialog" button in the top bar.

---

## 4. Top Bar Refinements

```
+--------------------------------------------------------------+
| [PanelLeftOpen] Panda | ProjectName / src / index.ts | [Share2] [EllipsisVertical] |
|                       |                              | LoaderCircle Running        |
+--------------------------------------------------------------+
```

### Changes from Current

| Element               | Before            | After                                                      |
| --------------------- | ----------------- | ---------------------------------------------------------- |
| Logo area             | Static Panda logo | `PanelLeftOpen`/`PanelLeftClose` toggle + "Panda" wordmark |
| Breadcrumb            | Same              | Same (no change)                                           |
| Job status            | Same              | Same (no change)                                           |
| Toggle Chat btn       | Present           | Removed (now a tab in right panel)                         |
| Toggle Artifacts btn  | Present           | Removed (now a sub-tab in Preview)                         |
| Automation dialog btn | Present           | Removed (now Manual/Auto toggle in right panel)            |
| Share                 | Present           | Stays (`Share2` icon)                                      |
| More menu             | Present           | Stays (`EllipsisVertical` icon)                            |

**Result:** Cleaner top bar with fewer buttons.

---

## 5. Spacing, Polish & Transitions

### Spacing Rules

- **4px baseline grid** — all padding, margins, gaps snap to multiples of 4.
- Panel content padding: `p-3` (12px).
- Dense areas (file tree, terminal): `p-2` (8px).
- Control bars and toolbars: `gap-2` (8px) between items.
- Header: `h-14` (56px). Status bar: `h-6` (24px).

### Visual Hierarchy

- Panel headers: `border-b` separator, `surface-1` background.
- Active right panel tab: `underline` indicator with `primary` color (orange).
- Sidebar flyout: `surface-1` background, `border-r` separator.
- Consistent use of `surface-0` (base) through `surface-3` (elevated).

### Transitions & Micro-Interactions

- Sidebar flyout open/close: `200ms ease-out` slide.
- Right panel tab switch: `150ms` crossfade.
- Manual/Auto toggle: sliding pill animation `150ms`.
- Button hovers: `150ms` background color transition.
- Message entry: staggered opacity animation (existing).
- File tree expand/collapse: `150ms` height animation.
- Sidebar toggle icon: animated rotation between `PanelLeftOpen` and
  `PanelLeftClose`.

### Typography & Density

- File tree: `leading-tight` line height.
- Metadata (timestamps, sizes): `text-xs`.
- Sidebar flyout labels: `text-sm font-medium`.
- Monospace stays for: file names, breadcrumbs, terminal, code elements.
- Body text: Geist Sans (existing).

---

## 6. Mobile Layout

```
Portrait:
+-------------------------+
| Top Bar (compact)       |
| [hamburger] Panda [sta] |
+-------------------------+
|                         |
| Full-screen content     |
| (active tab below)      |
|                         |
+-------------------------+
| [Workspace][Chat][Preview] |
+-------------------------+
```

### Changes from Current

- **Bottom tab bar:** gains third tab "Preview" (alongside Workspace and Chat).
- **Sidebar:** full-screen overlay triggered by hamburger icon. Shows all nav
  items with labels. Dismisses on selection.
- **Chat input:** fixed at bottom when Chat tab active. Tab bar hides when
  keyboard opens (existing).
- **Preview tab:** live preview iframe full-width.
- **Unread indicators:** badge dots on Chat and Preview tabs.

---

## 7. Icon Reference (Complete)

| Element              | Lucide Icon         | Context        |
| -------------------- | ------------------- | -------------- |
| Sidebar toggle open  | `PanelLeftOpen`     | Top bar        |
| Sidebar toggle close | `PanelLeftClose`    | Top bar        |
| New Chat             | `MessageSquarePlus` | Sidebar        |
| Explorer             | `FolderTree`        | Sidebar        |
| Search               | `Search`            | Sidebar        |
| History              | `Clock`             | Sidebar        |
| Builder/Preview      | `Eye`               | Sidebar        |
| Specs                | `FileCheck`         | Sidebar        |
| Terminal             | `TerminalSquare`    | Sidebar        |
| Settings             | `Settings`          | Sidebar        |
| Docs                 | `BookOpen`          | Sidebar        |
| Attach               | `Paperclip`         | Chat input     |
| Upload File          | `FilePlus2`         | Attach popover |
| Upload Image         | `ImagePlus`         | Attach popover |
| Send                 | `ArrowUp`           | Chat input     |
| Stop                 | `Square`            | Chat input     |
| Enhance              | `Sparkles`          | Chat input     |
| Share                | `Share2`            | Top bar        |
| More menu            | `EllipsisVertical`  | Top bar        |
| Running              | `LoaderCircle`      | Top bar status |
| Agent selector       | `Bot`               | Chat input     |
| Model selector       | `BrainCircuit`      | Chat input     |
| Variant selector     | `SlidersHorizontal` | Chat input     |

---

## 8. Files Impacted (Estimated)

### New Components

- `components/sidebar/SidebarRail.tsx` — Icon rail
- `components/sidebar/SidebarFlyout.tsx` — Expandable panel
- `components/sidebar/SidebarHistoryPanel.tsx` — History with project/all toggle
- `components/sidebar/SidebarNewChatPanel.tsx` — Quick-start chat
- `components/sidebar/SidebarTerminalPanel.tsx` — Terminal sessions
- `components/sidebar/SidebarDocsPanel.tsx` — Docs links
- `components/sidebar/SidebarSettingsPanel.tsx` — Settings links
- `components/sidebar/SidebarBuilderPanel.tsx` — Preview controls
- `components/preview/LivePreview.tsx` — Iframe preview renderer
- `components/chat/AttachmentButton.tsx` — File/image upload popover
- `components/chat/AttachmentPreview.tsx` — Thumbnails/chips for attachments
- `components/chat/ModeToggle.tsx` — Manual/Auto sliding toggle

### Modified Components

- `components/projects/ProjectWorkspaceLayout.tsx` — New three-zone layout
- `components/workbench/Workbench.tsx` — Remove activity bar, adapt to sidebar
- `components/workbench/ActivityBar.tsx` — Replace with SidebarRail
- `components/projects/ProjectChatPanel.tsx` — Add tabs (Chat/Preview), add mode
  toggle
- `components/chat/ChatInput.tsx` — Add attachment button, update icons
- `components/artifacts/ArtifactPanel.tsx` — Move into Preview tab
- `components/projects/ProjectHeader.tsx` — Simplify, add sidebar toggle
- `app/(dashboard)/projects/[projectId]/page.tsx` — Adapt to new layout
- `app/globals.css` — Spacing refinements, transition utilities
- `tailwind.config.ts` — Any new design tokens needed

### No Changes

- Convex backend (schema, functions) — untouched
- Agent harness (`lib/agent/harness/`) — untouched
- Spec engine (`lib/agent/spec/`) — untouched
- Settings pages — untouched
- Admin pages — untouched
- Auth — untouched
