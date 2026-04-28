# Spec: Chat-First Woven Coding Workspace

## Deliverables

- [ ] A chat-first workspace information architecture that makes the
      conversation timeline the primary work surface and treats files, diffs,
      terminal, preview, context, and receipts as run-derived supporting
      surfaces.
- [ ] A simplified review surface that reduces the current many-tab inspector
      model into fewer run-aware views without introducing a separate cockpit or
      parallel dashboard.
- [ ] A run timeline model that presents each agent run as one coherent
      sequence: user intent, routing decision, plan/clarification, tool
      activity, changes, validation, receipt, and next action.
- [ ] A woven integration path through the existing `useAgent` run lifecycle,
      `agentRuns` persistence, `RunProgressPanel`, `RunReceiptPanel`, and
      `ReviewPanel` slots rather than a new standalone feature shell.
- [ ] A session rail concept for active, background, completed, and blocked work
      that stays quiet and does not become a grid of agent cards.
- [ ] A composer model that preserves the canonical `ask`, `plan`, `code`, and
      `build` modes while allowing routing to make the default path feel smarter
      and lower-friction.
- [ ] A visual system direction for a calm, premium, operational Panda shell:
      brutalist structure, sharp surfaces, restrained density, meaningful state,
      and no decorative dashboard bloat.
- [ ] Updated tests for any changed routing, run timeline, receipt, review
      panel, or responsive layout behavior.
- [ ] Every UI or design-related milestone explicitly uses the `frontend-design`
      skill before shaping or implementing interface changes.

## Constraints

- The implementation must be woven into existing Panda architecture. Do not add
  a separate cockpit, command center, or duplicate agent-state system.
- The chat timeline is the primary work surface. Supporting panes must derive
  from the active chat/run state instead of competing with chat for attention.
- Preserve the four canonical modes: `ask`, `plan`, `code`, and `build`.
- Preserve manual mode override, oversight level, approval dialogs, planning
  sessions, specs, existing run lifecycle behavior, and existing receipt
  persistence semantics.
- Do not regress the routing and receipt work already completed. Requested mode,
  resolved mode, routing rationale, context audit, native execution,
  WebContainer execution, tokens, and terminal result status remain part of the
  run proof model.
- Do not store new persistent UI shell state in Convex unless it must survive
  across devices or sessions. Use Zustand only for local shell/session state.
- Keep Convex live query payloads bounded. Run timeline and receipt surfaces
  must use summaries by default and lazy detail loading where data can grow.
- Do not globally block coding/building on WebContainer readiness. Container
  state should inform routing and receipts without breaking fallback behavior.
- Follow Panda's brutalist design system: sharp corners, explicit state, precise
  spacing, strong structure, and restrained color.
- Use the `frontend-design` skill for all UI/design work, including layout
  diagrams, component restructuring, responsive adaptation, visual system
  passes, interaction hierarchy, and polish. If a milestone touches UI, load and
  follow that skill before design or implementation decisions.
- Avoid AI-slop visual patterns: no gradient text, no decorative glow cockpit,
  no glassmorphism shell, no metric-card dashboard, no nested card walls.
- Mobile must adapt into a chat-first tabbed workspace. Do not hide critical
  run, diff, preview, or receipt functionality on smaller screens.

## Out of Scope

- Replacing Panda with a full traditional IDE or editor-first workflow.
- Building unrestricted drag-and-drop pane layout as the primary interaction
  model.
- Adding LLM routing classification unless separately scoped behind a feature
  flag.
- Replacing Convex persistence, the agent runtime, the permission system, or the
  WebContainer execution adapter.
- Creating a new top-level cockpit/dashboard route separate from the project
  workspace.
- Rebranding Panda away from its brutalist technical identity.
- Adding multi-agent orchestration beyond quiet session/status surfaces required
  for the workspace layout.
- Adding PR automation, scheduled tasks, remote SSH sessions, or desktop
  computer use as part of this milestone.
