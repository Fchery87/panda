# Panda Workbench Modernization Design

**Date:** 2026-04-04
**Status:** Approved
**Goal:** Transform Panda's workbench from a traditional IDE layout to a modern, chat-dominant, agent-first workspace aligned with 2026 AI coding platform standards.

---

## Design Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Primary layout paradigm | Chat-dominant | Panda is spec-native and agent-driven — users primarily review and guide, not manually code |
| Code panel behavior | Split with smart defaults (60/40, auto-collapse) | Users need conversation context alongside code changes |
| Sidebar approach | Slim left rail (40px), no flyout, floating overlays | Familiar spatial anchoring without eating layout space |
| Terminal/activity | Inline in chat + pull-up activity drawer | Agent actions are part of the conversation; raw terminal is a fallback |
| Visual direction | Soft minimal | Industry-converged style (Linear, Cursor, v0); content as hero, not chrome |
| File review flow | Progressive disclosure (summary → inline diff → full editor) | Matches 80/20 usage: quick review in chat, deep review in editor |
| Multi-agent readiness | Agent tab bar (single tab now, multi-ready) | Low-cost future-proofing inspired by Cursor v3's direction |

---

## 1. Layout Architecture

```
+--------------------------------------------------------+
|      | [Agent Tab Bar]  (1 tab now, multi later)       |
|      +-------------------------+------------------------+
| Rail |                         |                        |
| 40px |    Chat (60%)           |    Code Panel (40%)    |
|      |                         |    (starts collapsed)  |
|  F   |  Messages stream        |    Editor / Diff view  |
|  S   |  Agent activity         |    File tabs           |
|  H   |  Inline diffs           |                        |
|  G   |                         |                        |
|      | +---------------------+ |                        |
|      | | Chat Input          | |                        |
|      | +---------------------+ |                        |
|      | == Activity Strip ==    |                        |
+--------------------------------------------------------+
```

### Agent Tab Bar

- Horizontal tab strip at the top, full-width after the rail (~40px height)
- Currently renders a single active agent session with chat title/project name
- Contains: agent tab(s), model selector, status indicator, and a "+" button (disabled/hidden for now, ready for multi-agent)
- Designed so adding more agent tabs later is just rendering more tab items — no structural changes needed

### Code Panel

- **Starts collapsed** (0% width). Chat fills the remaining space after the rail. First-time experience is clean and focused on the conversation.
- **Auto-expands** when the agent produces file changes or the user clicks "Open in Editor" from an inline diff. Animates to 40% width, pushing chat to 60%.
- **User can resize** the split via a drag handle (min 30% chat, min 25% code).
- **Collapse** back with a button or `Cmd+B`.
- **Expand to full width** (hides chat) with `Cmd+Shift+B` for deep manual editing sessions.
- **Double-click** the resize handle to snap back to 60/40 default.

### Activity Strip & Drawer

- 32px strip at the bottom of the chat area showing current agent state.
- Click or swipe to expand into a full activity drawer (bottom sheet, max 50% chat height).
- `Cmd+`` `` toggles the drawer.

### No Status Bar

Traditional status bar is eliminated. Status info (branch, model, connection) distributes to the activity strip and chat header.

---

## 2. Slim Rail & Floating Overlays

### Rail (40px)

Replaces the current `SidebarRail` (48px) + `SidebarFlyout` (220px) with a single slim strip.

**Icons (top to bottom):**

1. **Files** (`Cmd+Shift+E`) — floating file tree overlay (280px wide, anchored to rail edge, max 60% viewport height, scrollable)
2. **Search** (`Cmd+Shift+F`) — floating search panel (same positioning)
3. **History** (`Cmd+Shift+H`) — floating chat history list
4. **Settings** — settings overlay or navigation

**Removed from rail:**

- **Specs** — moves into the chat stream as contextual UI (spec badges, approval prompts appear inline)
- **Git** — moves into the activity drawer (branch info, changes list)
- **Terminal** — replaced by the activity drawer

### Overlay Behavior

- Click icon to open, click again or click outside to dismiss
- Only one overlay open at a time
- Overlays float above the chat+code layout with a subtle shadow and 12px border-radius
- Semi-transparent backdrop (not full-screen dimming — just enough to indicate layering)
- Animate in with quick scale from 0.97 + fade (framer-motion, 150ms)
- Keyboard shortcuts preserved

### Rail Visual Style

- No border-right separator — distinguished by slightly different background tint (`surface-1` vs `surface-0`)
- Icons: 20px, muted by default, primary color on hover/active
- Active indicator: subtle left-edge bar (3px, primary color) while overlay is open

---

## 3. Chat-First Main Area

### Chat Header (48px)

- **Left:** Project name as breadcrumb (clickable to project list)
- **Center:** nothing — keep it clean
- **Right:** Model selector pill, variant/reasoning toggle, theme toggle
- Mode toggle (build/architect/ask) moves to the chat input area

### Message Stream

- Full available width with comfortable **max-width of 720px**, centered within the panel
- **User messages:** right-aligned, subtle primary-tinted background, 8px radius
- **Agent messages:** left-aligned, surface-1 background, 8px radius
- **Agent activity blocks** render inline as collapsible cards:
  - Collapsed: single line — icon + "Modified `src/app.tsx`" or "Ran `npm test`" with status badge
  - Expanded: shows full diff or command output
  - Cards have a subtle left-edge color accent (green for success, red for error, amber for in-progress)

### Chat Input (bottom-pinned)

- Full-width textarea with auto-grow (up to 200px max, then scrolls)
- **Above input:** mode selector pills (Build / Architect / Ask) — compact, horizontal
- **Beside input:** attachment button, @-mention trigger, send button
- Model selector and variant accessible from pills within the input chrome (secondary location to header)
- Subtle top border or shadow to separate from scroll area

### Empty State (no messages)

- Large centered prompt: "What would you like to build?" with 3-4 suggested starter prompts as clickable cards
- Replaces the current "No file selected" editor empty state — the chat IS the starting point

---

## 4. Smart Code Panel & Progressive Disclosure

### Code Panel Lifecycle

1. **Collapsed (default)** — 0% width, completely hidden. A subtle "code" icon in the agent tab bar allows manual toggle.
2. **Auto-expand** — When agent produces file changes, animates open to 40% (250ms ease-out).
3. **Contents:** File tab bar (8px radius tabs), diff view by default for agent-modified files, clean editor for manually opened files.
4. **Controls:** Resize (drag), collapse (`Cmd+B`), full-width (`Cmd+Shift+B`), double-click handle to reset 60/40.

### Progressive Disclosure in Chat

**Step 1 — Collapsed summary:**
```
+---------------------------------------+
| G  Modified 3 files                   |
|    src/app.tsx . utils.ts . api.ts    |
|    [Review Changes]  [Accept All]     |
+---------------------------------------+
```

**Step 2 — Click "Review Changes" for inline diffs:**
```
+---------------------------------------+
| G  src/app.tsx  (+12, -3)             |
| +-----------------------------------+ |
| |  - const old = "value"            | |
| |  + const new = "better"           | |
| +-----------------------------------+ |
| G  utils.ts  (+4, -1)                |
| +-----------------------------------+ |
| |  + export function helper() {}    | |
| +-----------------------------------+ |
|  [Open in Editor]  [Accept All]      |
+---------------------------------------+
```

**Step 3 — Click "Open in Editor":**
Code panel auto-expands with full editor view of the selected file.

### Accept/Reject Flow

- "Accept All" applies all changes immediately
- Individual files can be accepted/rejected from inline diffs
- Rejected files get a strikethrough treatment
- After acceptance, collapses to one-line "Applied 3 files" confirmation

---

## 5. Activity Drawer & Terminal

### Activity Strip (always visible, 32px)

- Shows current agent state: "Idle" / "Thinking..." / "Writing src/app.tsx" / "Running npm test"
- Animated status dot: pulsing green (active), static gray (idle), red (error)
- **Left:** status text with icon
- **Right:** branch name pill, connection indicator
- Click to expand the full drawer

### Activity Drawer (expanded)

- Bottom sheet, max 50% of chat area height
- **Unified activity feed** — structured log, not raw terminal:
  - Each entry is a card: timestamp, action type icon, description, expandable output
  - Command entries: command, exit code, collapsible stdout/stderr
  - File change entries: link back to inline diff in chat
  - Filterable: All / Commands / Files / Errors (horizontal pill tabs)
- **"Raw Terminal" tab** at the end of filter pills for manual command input/output
- Drag handle at top for resizing
- `Cmd+`` `` toggles open/closed
- Remembers last open height in localStorage

### What Moves Here

- `Terminal` panel → Raw Terminal tab
- `StatusBar` info → Activity strip + chat header
- `SidebarGitPanel` → Git section in activity feed + branch pill in strip

---

## 6. Visual Design System Refresh

### Border Radius

| Element | Old | New |
|---|---|---|
| Global `--radius` | `0px` | `8px` |
| Cards, buttons, inputs, overlays | `0px` | `8px` |
| Code blocks, inline diffs | `0px` | `6px` |
| Rail (structural element) | `0px` | `0px` (stays flush) |

### Typography

| Context | Old | New |
|---|---|---|
| UI text (headers, labels, buttons) | `font-mono` everywhere | Geist Sans (already loaded) |
| Code editor, diffs, file paths, terminal, kbd shortcuts | `font-mono` | `font-mono` (stays) |
| Panel headers | `uppercase tracking-widest font-mono text-xs` | Normal-case, medium weight, Geist Sans |

### Color Palette

**Kept:** Gold/amber primary `hsl(38 92% 50%)` — Panda's identity.

**Surface layers (dark mode — tighter range for less "stacked boxes" feel):**

| Token | Old | New |
|---|---|---|
| `--surface-0` | `30 10% 8%` | `30 10% 7%` |
| `--surface-1` | `30 10% 12%` | `30 10% 9%` |
| `--surface-2` | `30 10% 16%` | `30 10% 12%` |

**Borders:**
- Most borders: `border-border/50` (half opacity) instead of full `border-border`
- Full opacity only on primary structural dividers (rail edge, panel resize handle)

**Muted foreground:** bumped up slightly for better readability.

### Spacing & Density

| Element | Old | New |
|---|---|---|
| Chat message gap | 16px | 20px |
| Panel headers | `min-h-11` (44px) | 40px |
| Rail | 48px wide, 24px icons | 40px wide, 20px icons |
| Chat input padding | varies | 16px inside, 12px margin from edges |

### Shadows & Depth

- **Floating overlays:** `shadow-lg` with blur (currently no shadows used)
- **Resize handles:** invisible by default, subtle glow on hover (replaces 1px line + dot grip)
- **Activity drawer:** top shadow when expanded

### Animations

| Action | Duration | Easing |
|---|---|---|
| Panel expand/collapse | 250ms | ease-out (framer-motion layout) |
| Overlay open/close | 150ms | scale 0.97 + fade |
| Status dot pulse | 2s | infinite CSS animation |
| Inline diff expand | 200ms | height + overflow clip |
| All animations | < 300ms | Snappy, not floaty |

### Dark Mode Priority

- Dark mode is the **primary** design target
- Light mode supported but dark gets polish attention
- Gold accent should feel warm against dark surfaces, not jarring

---

## 7. Component Migration Map

### Kept (restyled)

| Current Component | Changes |
|---|---|
| `CodeMirrorEditor` | Restyle wrapper only, editor internals untouched |
| `FileTabs` → `CodePanelTabs` | Softer styling (radius, no uppercase), lives in code panel |
| `FileTree` | Renders inside floating overlay instead of flyout |
| `ProjectSearchPanel` | Renders inside floating overlay |
| `ChatInput` | Move mode selector into input area, restyle |
| `MessageList` / `MessageBubble` | Restyle: radius, spacing, max-width centering |
| `CommandPalette` | Restyle with new radius/shadows |
| `PermissionDialog` | Restyle |
| `ComposerOverlay` | Restyle |

### Transformed

| Current | Becomes | Changes |
|---|---|---|
| `Workbench.tsx` (590 lines) | `WorkspaceShell.tsx` | Complete rewrite — new layout with rail, chat, code panel, drawer |
| `ProjectWorkspaceLayout.tsx` | Merged into `WorkspaceShell` | Redundant wrapper layer eliminated |
| `SidebarRail.tsx` | `NavRail.tsx` | Slimmer (40px), fewer icons, new visual style |
| `SidebarFlyout.tsx` | `FloatingOverlay.tsx` | Generic floating panel, not a permanent split |
| `Terminal.tsx` | `ActivityDrawer.tsx` | Bottom sheet with structured feed + raw terminal tab |
| `StatusBar.tsx` | Eliminated | Info splits to activity strip + chat header |
| `ProjectChatPanel.tsx` | `ChatPanel.tsx` | Becomes main view, not side panel. Simpler props |
| `RightPanel.tsx` | Eliminated | Chat is no longer a "right panel" |
| `ReviewPanel.tsx` | Inline in chat | Review flow via progressive disclosure in messages |

### Removed Entirely

| Component | Reason |
|---|---|
| `SidebarFlyout.tsx` | Replaced by floating overlays |
| `SidebarHistoryPanel.tsx` | History moves to floating overlay |
| `SidebarGitPanel.tsx` | Git info moves to activity drawer |
| `ExplorerOutline.tsx` | Code outline becomes dropdown in code panel header |
| `StatusBar.tsx` | Distributed to strip + header |
| `RightPanel.tsx` | Concept eliminated |
| `GripIndicator` | New resize handles use glow, no dots |
| Mobile tab bar logic | Replaced by responsive `WorkspaceShell` |

### New Components to Create

| Component | Purpose |
|---|---|
| `WorkspaceShell.tsx` | Root layout — rail, agent tabs, chat, code panel |
| `NavRail.tsx` | 40px icon rail with overlay triggers |
| `FloatingOverlay.tsx` | Reusable floating panel (files, search, history) |
| `AgentTabBar.tsx` | Top tab strip (single tab now, multi-ready) |
| `ActivityStrip.tsx` | 32px bottom status strip |
| `ActivityDrawer.tsx` | Pull-up bottom sheet with structured feed |
| `AgentActivityCard.tsx` | Individual activity entry in chat stream or drawer |
| `InlineDiffBlock.tsx` | Collapsible diff card for chat messages |
| `FileChangeSummary.tsx` | "Modified N files" summary card with progressive expand |
| `CodePanel.tsx` | Right-side editor container with auto-expand logic |

---

## 8. Cursor v3 Comparison

For context, this design was developed with awareness of Cursor v3 (released April 2, 2026).

| Aspect | Cursor v3 | Panda |
|---|---|---|
| Core paradigm | Multi-agent fleet orchestration | Single-agent conversation-first |
| Primary view | Agent tabs (grid/stack of parallel agents) | Chat stream + smart-expanding code panel |
| Sidebar | Agent roster (agents from Slack, GitHub, etc.) | Slim icon rail with floating overlays |
| Code editing | Separate IDE view you switch to | Integrated code panel that auto-expands contextually |
| Terminal/activity | Embedded in each agent's tab | Inline in chat + pull-up activity drawer |
| File changes | Diffs within agent output | Progressive disclosure (summary -> diff -> editor) |
| Browser preview | Yes (Design Mode) | No (intentional — not Panda's focus) |
| Multi-agent | Core feature | Future-ready via agent tab bar |

**Panda's positioning:** More focused (single agent), more integrated (code alongside chat), less radical (evolving the IDE rather than replacing it). The agent tab bar provides a migration path to multi-agent without requiring a rewrite.

---

## 9. Implementation Priority

Recommended build order:

1. **WorkspaceShell + NavRail + AgentTabBar** — structural skeleton
2. **ChatPanel promotion** — chat as primary view, restyled
3. **CodePanel with auto-expand** — smart collapse/expand behavior
4. **FloatingOverlay** — file tree, search, history as overlays
5. **ActivityStrip + ActivityDrawer** — replace terminal + status bar
6. **InlineDiffBlock + FileChangeSummary** — progressive disclosure in chat
7. **AgentActivityCard** — inline agent actions in chat stream
8. **Visual design system** — radius, typography, colors, spacing (can be done in parallel with any step)
9. **Mobile responsive** — adapt the new layout for mobile breakpoints
10. **Cleanup** — remove deprecated components, dead code
