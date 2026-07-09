# Split WorkspaceRuntimeProvider into focused context providers

Status: accepted

`WorkspaceRuntimeProvider` grew to 783 lines wiring ~25 hooks and passing 60+
props through three component layers. UI layout state existed in both the
`workspaceUiStore` (Zustand) and local React state inside the provider via
hooks like `useWorkbenchPanelState`, creating two competing state systems.

We are splitting the god component into three focused providers and
consolidating all UI layout state into the Zustand store.

## Considered Options

1. **Three focused providers + Zustand store** — `SessionProvider` (chat, runs,
   artifacts, plan, specs), `FileProvider` (files, tabs, editor content),
   `RuntimeProvider` (terminal, webcontainer, git). All UI layout state moves
   to `workspaceUiStore`. Components subscribe to slices via selectors.
   *(Chosen)*

2. **Keep single provider, just move state to Zustand** — Less restructuring
   but the 783-line file remains a maintenance burden and testing nightmare.

3. **Replace props with a single mega-context** — One context with everything.
   Rejected because it causes re-renders on every state change (no selector
   granularity).

## Consequences

- `ProjectWorkspaceLayout` drops from 60+ props to ~5.
- Components re-render only when their specific slice changes.
- The duplicate state systems (store vs local hooks) are eliminated.
- Each provider can be tested independently.
- Migration is incremental: providers can be introduced one at a time without
  breaking the existing prop-passing pattern.
