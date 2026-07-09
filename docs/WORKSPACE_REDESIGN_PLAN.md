# Workspace Redesign Plan

> Status: **accepted** — result of a grilling session on July 8, 2026
> Grounded in July 2026 research: Cursor 3.1, Windsurf 2, VS Code Copilot
> Supersedes the layout model described in [WORKBENCH.md](./WORKBENCH.md)

## Summary

Panda's workspace had drifted from its documented "Chat-First Workbench"
principle into an editor-centric layout with a conditional chat dock, a
redundant Focus Mode bar, an overloaded home screen, and a 783-line god
component managing 60+ props. This plan formalises the editor-first direction
and restructures the workspace to match July 2026 AI coding IDE standards.

**Core decision:** Adopt the Windsurf 2 model — a single persistent right
sidebar that merges chat and inspector into one always-visible surface.

## Decisions

### Terminology (ADR-0004)

| Term | Definition |
|------|-----------|
| **Workspace** | The entire project surface (top bar + all panels + dock + status bar) |
| **Workbench** | The center editing surface only (file tabs, editor, diff, plan artifact) |
| **Execution Session** | The live agent run lifecycle (chat → plan → run → changes → proof) |

"Execution Session Shell" is deprecated → use "Workspace."
"Chat-First Workbench" is deprecated → editor-first is the formal model.

### Layout Model (ADR-0004)

**Before:**
```
┌──────────────────────────────────────────────────────┐
│ TopBar                                                │
├──────┬─────────────────┬──────────┬──────────────────┤
│Focus │ SidebarRail +   │ Workbench│ Chat Dock?       │
│ Mode │ Flyout          │ (Editor) │ (conditional)    │
│ Bar  │ (Files/Agents/  │          │                  │
│      │  Search/Git/    │          ├──────────────────┤
│      │  Tasks)         │          │ Right Panel?     │
│      │                 │          │ (conditional)    │
├──────┴─────────────────┴──────────┴──────────────────┤
│ Bottom Dock? (Terminal)              StatusBar        │
└──────────────────────────────────────────────────────┘
```

**After:**
```
┌──────────────────────────────────────────────────────┐
│ TopBar                                                │
├──────┬─────────────────┬─────────────────────────────┤
│ Side │ Left Sidebar    │ Right Sidebar (persistent)   │
│ bar  │ (Files/Search/  │ ┌────┬───┬───┬────┐         │
│ rail │  Git)           │ │Chat│Run│Chg│Ctx │         │
│      │                 │ └────┴───┴───┴────┘         │
│      │                 │ [Active tab content]         │
│      ├─────────────────┤                             │
│      │ Editor Panel    │                             │
│      │ (Editor | Diff) │                             │
│      │ FileTabs        │                             │
│      │ EditorHome      │                             │
│      │ (when empty)    │                             │
├──────┴─────────────────┴─────────────────────────────┤
│ Bottom Dock? (Terminal)              StatusBar        │
└──────────────────────────────────────────────────────┘
```

### Panel Topology

| Panel | Position | Content | Visibility |
|-------|----------|---------|------------|
| **Left Sidebar** | Left | Files, Search, Git | Togglable (Cmd+B) |
| **Editor Panel** | Center | Editor, Diff, FileTabs, EditorHome | Always primary |
| **Right Sidebar** | Right | Chat, Run, Changes, Context (4 tabs) | Persistent (Cmd+J) |
| **Bottom Dock** | Bottom | Terminal | Togglable (Cmd+`) |

### What's Removed

| Removed | Why |
|---------|-----|
| Focus Mode bar (4 buttons) | Persistent sidebar eliminates need for manual focus toggles |
| Conditional chat dock | Chat is always visible in the right sidebar |
| Separate right panel state | Merged into right sidebar |
| Agents section (left sidebar) | Moved to right sidebar session switcher |
| Tasks section (left sidebar) | Moved to right sidebar session switcher |
| Mode-dependent layout keys | Single persistence key per panel group |
| WorkspaceHome 8+ sections | Simplified to 2 (Session Status + Quick Start) |
| `'logs'` and `'tests'` center tab types | Dead code — never rendered |

### What's Added

| Added | What |
|-------|------|
| Right Sidebar (4 tabs) | Merges chat dock + inspector into one persistent surface |
| Session Switcher | Chat tab header dropdown for switching execution sessions |
| Agent Execution Cards (ADR-0006) | Lifecycle-state cards replacing plain-text tool calls |
| Sidebar icon-rail collapse | Right sidebar collapses to icon rail with activity badges |
| Terminal notification badge | Badge on collapsed dock when output/failed command exists |

### Chat Mode Behavior

Modes change **behavior and tab emphasis**, never **layout structure**:

| Mode | Chat tab | Run tab | Changes tab | Layout |
|------|----------|---------|-------------|--------|
| `ask` | Active | — | — | No change |
| `plan` | Active | — | — | No change |
| `code` | Active | Badge on exec | Badge on changes | No change |
| `build` | Active | Badge on exec | Badge on changes | No change |

### State Management (ADR-0005)

Split `WorkspaceRuntimeProvider` (783 lines) into 3 focused providers:

```
SessionProvider  — chat, runs, artifacts, plan, specs, advisor
FileProvider     — files, tabs, editor content, dirty state
RuntimeProvider  — terminal, webcontainer, git
```

All UI layout state → `workspaceUiStore` (Zustand). Eliminate duplicate state
from local hooks.

### Component Architecture

| Current | Renamed | Notes |
|---------|---------|-------|
| `Workbench.tsx` | `EditorPanel.tsx` | It's the editor surface |
| `WorkspaceHome.tsx` | `EditorHome.tsx` | Editor's empty state |
| `WorkbenchRightPanel.tsx` | *(removed)* | Merged into `RightSidebar.tsx` |
| `ProjectWorkspaceLayout.tsx` | `WorkspaceLayout.tsx` | Shorter name |
| *(new)* | `RightSidebar.tsx` | 4-tab persistent sidebar |
| *(new)* | `SessionSwitcher.tsx` | Chat tab header session list |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+B` | Toggle left sidebar |
| `Cmd+J` | Toggle right sidebar |
| `Cmd+`` | Toggle terminal |
| `Cmd+K` | Command palette |
| `Cmd+1` | Right sidebar → Chat |
| `Cmd+2` | Right sidebar → Run |
| `Cmd+3` | Right sidebar → Changes |
| `Cmd+4` | Right sidebar → Context |
| `Cmd+Shift+1/2/3` | Left sidebar → Files/Search/Git |

### Mobile Layout

Bottom tab bar aligned with new model:
- **4 tabs:** Editor, Chat, Run, Changes
- Chat is **always accessible** (not conditional)
- Context tab merges into Chat on mobile (collapsible sections above composer)
- Left sidebar via hamburger (Files, Search, Git only)
- Session switcher from Chat tab header

## Implementation Phases

### Phase 1: Layout Restructure (no behavior change)
- Create `RightSidebar.tsx` composing existing chat + inspector tabs
- Move chat dock and right panel into right sidebar
- Remove Focus Mode bar
- Remove conditional chat dock logic
- Single layout persistence key per panel group
- Update mobile bottom bar mapping

### Phase 2: State Management (ADR-0005)
- Move all UI state to `workspaceUiStore`
- Remove duplicate local state from hooks
- Split `WorkspaceRuntimeProvider` into 3 providers
- Reduce `WorkspaceLayout` props from 60+ to ~5

### Phase 3: Navigation & Polish
- Move Agents/Tasks sections to right sidebar session switcher
- Left sidebar becomes Files/Search/Git only
- Simplify `EditorHome` from 8 sections to 2
- Rename components (Workbench → EditorPanel, etc.)
- Add sidebar icon-rail collapse with badges
- Add terminal notification badge
- Implement keyboard shortcuts

### Phase 4: Agent Execution Cards (ADR-0006)
- Design card component architecture (content blocks)
- Implement lifecycle states (pending → running → success/error)
- Card types: File Edit, Command, Search, MCP, Subagent
- Batch summary cards with expand
- Migrate existing tool call rendering

## References

- [ADR-0004: Windsurf-style persistent right sidebar](../docs/adr/0004-adopt-windsurf-style-persistent-right-sidebar.md)
- [ADR-0005: Split WorkspaceRuntimeProvider](../docs/adr/0005-split-workspace-runtime-provider-into-focused-providers.md)
- [ADR-0006: Agent Execution Cards](../docs/adr/0006-render-tool-calls-as-lifecycle-state-agent-execution-cards.md)
- [CONTEXT.md: Updated glossary](../CONTEXT.md)
- [WORKBENCH.md: Prior product contract (being superseded)](./WORKBENCH.md)
