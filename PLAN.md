# Plan: Chat-First Woven Coding Workspace

## Milestone 1: Workspace Information Architecture

What: Define the target shell hierarchy and map current Panda surfaces into a
chat-first model: conversation timeline, session rail, review/proof surface,
changes, context, preview, and composer.

Skill requirement: Use `frontend-design` before producing layout diagrams or
making interface direction decisions for this milestone.

Acceptance criteria:

- The target layout names one primary surface: the chat/run timeline.
- Current surfaces are mapped into fewer run-aware views rather than new panels.
- Review tabs have a consolidation proposal that preserves existing
  capabilities.
- Desktop and mobile layout diagrams are documented before code changes.
- The design keeps receipts and routing visible without making the UI feel like
  a dashboard.

Validation: documentation review plus `bun run typecheck` before moving to code.

Status: [x] complete

## Milestone 2: Run Timeline Contract

What: Shape the interface between `useAgent`, run events, receipts, and UI so a
run can render as one coherent timeline with progressive disclosure.

Skill requirement: Use `frontend-design` before defining the user-facing run
timeline presentation or any timeline component behavior.

Acceptance criteria:

- Timeline stages cover user intent, routing, planning/clarification, tool
  activity, changes, validation, receipt, and next action.
- Existing run events and receipts are reused wherever possible.
- Any new derived view model is pure and testable without React or Convex.
- The contract hides low-level event noise from default UI while preserving
  detail for inspection.

Validation:
`bun run typecheck && bun test apps/web/components/chat apps/web/lib/agent`

Status: [x] complete

## Milestone 3: Review Surface Consolidation

What: Refactor the existing review/proof area into fewer high-signal views,
targeting a model such as `Run`, `Changes`, `Context`, and `Preview` while
folding current tabs into those destinations.

Skill requirement: Use `frontend-design` before changing review surface layout,
tab hierarchy, labels, density, or visual hierarchy.

Acceptance criteria:

- No new inspector panel is introduced.
- Existing run progress and receipt content remain available.
- Artifacts/diffs are reachable from the changes view.
- Memory, state, decisions, and activity become contextual details rather than
  equal-weight top-level tabs where possible.
- Legacy or unavailable receipt data remains graceful.

Validation: `bun run typecheck && bun run lint && bun test apps/web/components`

Status: [x] complete

## Milestone 4: Chat Timeline UX Integration

What: Make routing, progress, tool activity, and receipts feel native to the
chat thread instead of adjacent to it.

Skill requirement: Use `frontend-design` before changing chat timeline UI,
routing badge presentation, activity grouping, receipt entry points, or
confirmation states.

Acceptance criteria:

- Routing appears inline and compact before execution when useful.
- Tool activity defaults to summarized groups with expansion for detail.
- Completed runs expose their receipt and changed artifacts from the relevant
  timeline location.
- Medium/low confidence routing can ask for confirmation without opening a modal
  or separate workflow surface.
- Autopilot/high-confidence paths remain low-friction.

Validation:
`bun run typecheck && bun run lint && bun test apps/web/hooks apps/web/components/chat`

Status: [x] complete

## Milestone 5: Session Rail and Background Work State

What: Introduce or refine a quiet session rail that shows active, blocked,
background, and completed work without turning the UI into a grid of agent
cards.

Skill requirement: Use `frontend-design` before designing or implementing the
session rail, status markers, unread states, or background-work presentation.

Acceptance criteria:

- The rail prioritizes active chat/run state and unread/needs-attention markers.
- Background work is visible but not visually dominant.
- Session status is derived from existing chat/run data where possible.
- The rail supports quick return to blocked or completed runs.
- The design avoids duplicating Convex state in local stores unless required for
  UI-only interaction state.

Validation:
`bun run typecheck && bun run lint && bun test apps/web/components apps/web/stores`

Status: [x] complete

## Milestone 6: Responsive Workspace Adaptation

What: Adapt the chat-first workspace for smaller screens using tabs or stacked
views while preserving access to chat, files/context, run proof, changes, and
preview.

Skill requirement: Use `frontend-design` before designing or implementing
mobile, tablet, or responsive workspace behavior.

Acceptance criteria:

- Mobile keeps chat primary.
- Run proof, changes, files/context, and preview remain reachable without hidden
  functionality.
- The composer remains usable with mode and oversight controls.
- Layout changes preserve keyboard and screen-reader accessibility.

Validation:
`bun run typecheck && bun run lint && bun test apps/web/components && bun run test:e2e`

Status: [x] complete

## Milestone 7: Visual System Pass

What: Apply the calm operational brutalist direction across the updated shell,
including spacing rhythm, surface hierarchy, state color, typography discipline,
and microcopy.

Skill requirement: Use `frontend-design` before the visual system pass and keep
its anti-slop guidance active throughout this milestone.

Acceptance criteria:

- The interface feels like a premium technical instrument, not a generic AI IDE.
- Color is used for operational meaning: confidence, risk, approval, execution,
  validation, and blocked state.
- Spacing creates clear hierarchy between chat, proof, and support surfaces.
- The updated shell avoids decorative gradients, glows, glassmorphism, nested
  cards, and metric-dashboard repetition.
- New copy is direct and operational.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test`

Status: [x] complete

## Milestone 8: Full Verification and Regression Gate

What: Run the full quality gate and repair regressions before considering the
workspace redesign complete.

Acceptance criteria:

- TypeScript, lint, formatting, unit tests, and relevant e2e tests pass.
- Existing routing, receipts, planning sessions, specs, approvals, WebContainer
  fallback, and manual mode switching still work.
- No Convex live query payload grows unbounded due to the new workspace
  surfaces.
- No new accessibility blockers are introduced for keyboard or screen-reader
  users.

Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test && bun run test:e2e`

Status: [x] complete
