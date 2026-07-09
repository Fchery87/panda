# Adopt Windsurf-style persistent right sidebar for chat and inspector

Status: accepted

Panda's workspace had drifted from its documented "Chat-First Workbench"
principle into an editor-centric layout where chat was a conditional dock that
disappeared in certain modes. As of July 2026, every major AI coding tool
(Cursor 3.1, Windsurf 2, VS Code Copilot) keeps the AI panel persistent and
never conditional. We are formalising the editor-first direction and adopting
the Windsurf Cascade model: a single persistent right sidebar that merges the
chat dock and the inspector panel (Run / Changes / Context) into one surface
with 4 tabs.

## Considered Options

1. **Windsurf model: persistent right sidebar** — Chat + inspector merged into
   one always-visible right sidebar with 4 tabs (Chat, Run, Changes, Context).
   Chat is the default tab. Sidebar collapses to a rail but never disappears.
   *(Chosen)*

2. **Cursor model: dual-mode** — Traditional editor-first workspace + full-screen
   Agents Window for parallel agent execution. Bigger build, future-proofs for
   parallel agents but over-engineered for current needs.

3. **VS Code model: flexible chat positioning** — Chat can move between sidebar,
   editor tab, or separate window. Maximum flexibility but high complexity to
   maintain.

4. **Phased: sidebar now, dual-mode later** — Start with option 1, design for
   option 2 as future enhancement. Rejected because the sidebar model is
   sufficient and adding dual-mode later would require rework either way.

## Consequences

- Eliminates the conditional chat dock logic (`shouldRenderChatDock`).
- Eliminates separate right panel open/close state (`isRightPanelOpen`).
- Eliminates the Focus Mode bar (only one right-side surface remains).
- Simplifies layout persistence keys (no more chat-open/right-open/focus-mode
  combinations).
- Chat modes (ask/plan/code/build) no longer change panel visibility — they
  change chat behavior and the active tab emphasis, not layout structure.
- The left SidebarRail (Files, Agents, Search, Git, Tasks) remains unchanged
  for now; a future decision may move agent/task sections into the right
  sidebar.
