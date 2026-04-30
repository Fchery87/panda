# Execution Session Finalization Plan

> Reader: Panda maintainers and future agents finishing the session-first
> product transformation.
>
> Post-read action: implement the remaining user-visible behavior in thin,
> verifiable vertical slices until Panda no longer behaves like an IDE with a
> renamed shell.

## Purpose

The first upgrade wave established the Execution Session vocabulary, view-model
seam, inspector framing, rail grouping, branch summaries, and architecture
decision to keep sessions derived for now.

This plan covers what remains: the actual session timeline, persistent composer,
contextual support surfaces, grouped activity narrative, resumability, and
browser verification. These are the pieces that make Panda feel like “I start a
goal, Panda works through it, I inspect proof and changes, then I continue or
finish.”

## Definition Of Done

Panda is done with this upgrade when:

- The center canvas is a real Execution Session timeline, not just a renamed
  workbench/home state.
- The composer is persistent and visibly the main control point for the session.
- Files, editor, terminal, diff, search, and git are contextual support
  surfaces.
- Changed files are reviewed as “what this session changed.”
- Run/tool activity is grouped into compressed human-readable phases by default.
- Every visible session has goal, last state, changed files, last run status,
  pending review, and next recommended action.
- Planning, execution, proof, changes, preview, and branch outcomes appear as
  phases of one session.
- Browser smoke verification passes on desktop and mobile breakpoints.

## Remaining Vertical Slices

### S01: Timeline Row Contract

Risk: high

Depends: none

Build a timeline-row contract on top of the existing Execution Session model.
Rows should represent user intent, planning state, grouped tool activity,
changed work, validation, receipt/proof, preview, branch outcomes, and next
action. Raw logs and tool details stay expandable, not default content.

After this: a session can be rendered as compressed timeline rows without
changing storage.

Acceptance criteria:

- Timeline rows include stable IDs, kind, title, summary, tone, timestamp when
  available, and optional detail payload references.
- Tool/run events can collapse into groups such as Read, Changed, Ran,
  Validated, Needs approval, Failed, and Recovered.
- Tests cover empty, planning, executing, review-ready, failed, branch, and
  completed sessions.

### S02: Timeline Canvas UI

Risk: high

Depends: S01

Replace the current session/home canvas with a real timeline renderer. It should
show the active session objective, timeline rows, proof/change/preview summary,
and one explicit next action.

After this: opening a project with no selected file shows an actionable session
timeline, not an IDE home screen.

Acceptance criteria:

- Timeline rows render compressed by default with expandable details.
- The primary next action is visible above or below the timeline.
- Changed work and proof rows open the session inspector surfaces.
- Existing editor and diff routes remain reachable.
- Component tests cover default, executing, review-ready, and empty states.

### S03: Persistent Composer Control Plane

Risk: high

Depends: S02

Make the composer feel like the persistent control point for the Execution
Session. Mode, model, attachments, context, stop/retry, and follow-up actions
should orbit the composer rather than being scattered across panels.

After this: the user can always continue, steer, stop, retry, or add context to
the active session from one dominant input area.

Acceptance criteria:

- Composer remains visible in the main session experience on desktop and mobile.
- Mode and model controls are reachable from the composer area.
- Stop/retry/follow-up states are session-aware.
- Attachments/context controls remain available without crowding the timeline.
- Browser or component tests verify the composer is present in session states.

### S04: Contextual Support Surfaces

Risk: medium

Depends: S02

Demote files, editor, terminal, diff, search, git, and deploy from primary
navigation into support surfaces opened from session rows, inspector actions, or
secondary rail affordances.

After this: the default workspace hierarchy is session first; IDE tools are
available on demand.

Acceptance criteria:

- Left rail primary area emphasizes sessions; tools move to a secondary section
  or contextual launcher.
- File tree opens only when inspecting or editing files.
- Diff opens from changed-work/session rows and remains session-attached.
- Terminal opens from run/proof/runtime actions, not as a default workspace
  anchor.
- Tests verify session-first navigation labels and support-surface access.

### S05: Session-Attached Changed Work Review

Risk: medium

Depends: S02

Redesign changed-work review around the active session. The user should review
files changed by this session, see validation/proof next to those changes, and
accept/reject/apply from that context.

After this: users review “what this session changed” instead of hunting through
an IDE-style diff tab.

Acceptance criteria:

- Changed-work summary groups files by created, modified, and deleted.
- Each changed file links to diff/detail without leaving the session context.
- Apply/reject actions remain available where supported.
- Validation/proof summary is visible near changed files.
- Tests cover no changes, one change, multiple grouped changes, and pending
  review states.

### S06: Resumable Session State

Risk: high

Depends: S01, S02, S05

Ensure every session can be resumed with goal, last state, changed files, run
status, pending review, branches, and next action visible immediately. Keep this
derived from existing records unless a persistence need becomes unavoidable.

After this: returning to a project or selecting a previous session gives an
immediate “where we left off” summary.

Acceptance criteria:

- Session rail selection restores the session timeline and inspector state.
- Derived session model includes enough state for resume summary.
- Completed, blocked, review-ready, and executing sessions produce different
  next actions.
- Tests cover selecting a previous session and rendering the resume summary.

### S07: Branch Strip And Merge Review

Risk: medium

Depends: S02, S06

Render parallel agents as branches inside the session timeline, not as a swarm
dashboard. Branch details should stay lazy-loaded or inspector-scoped.

After this: users see parallel work as outcomes for one session goal.

Acceptance criteria:

- Branch strip shows title, status, outcome, validation state, and changed-file
  count when available.
- Blocked/failed branches produce action-oriented copy.
- Merge/reject/continue actions are shown only when branch metadata supports
  them.
- Raw branch logs are hidden behind detail expansion.
- Tests cover running, blocked, complete, conflict, and merged states.

### S08: Browser Smoke And Responsive Proof

Risk: medium

Depends: S02, S03, S04, S05, S06

Verify the final product behavior in a browser on desktop and mobile sizes.
Automated tests should assert that the session timeline, composer, inspector,
support surfaces, and mobile navigation all work together.

After this: the upgrade has live UI proof, not just component/type/unit proof.

Acceptance criteria:

- Desktop smoke covers project open, session timeline, composer, changed work,
  inspector, and support surface opening.
- Mobile smoke covers session/chat first navigation, proof, preview, and
  composer access.
- Console has no new runtime errors for the exercised paths.
- Full repository gate passes after smoke fixes.

## Recommended Execution Order

1. S01 Timeline Row Contract
2. S02 Timeline Canvas UI
3. S03 Persistent Composer Control Plane
4. S04 Contextual Support Surfaces
5. S05 Session-Attached Changed Work Review
6. S06 Resumable Session State
7. S07 Branch Strip And Merge Review
8. S08 Browser Smoke And Responsive Proof

S03 and S04 can proceed in parallel after S02 if separate agents own them. S05
can also proceed after S02, but S06 should wait for S05 so resume summaries can
include changed-work state.

## Non-Goals

- Do not add a dedicated Execution Session table unless S06 proves derived state
  is insufficient.
- Do not make orchestration, subagents, or branches the top-level navigation.
- Do not remove editor/file/terminal power; demote it into support surfaces.
- Do not copy OpenCode Desktop runtime architecture.
- Do not replace the harness before the session UI is finished.

## Proof Strategy

- Unit tests for view-model contracts and timeline row derivation.
- Component tests for timeline, composer, inspector, support surfaces, changed
  work, and branch strip rendering.
- Browser smoke tests for desktop and mobile session workflows.
- Full gate: typecheck, lint, format check, unit tests, and browser smoke.

## Open Decision

Only one decision should remain open during this finalization: whether derived
session state is enough for robust resume. If S06 exposes a concrete need for
cross-chat continuation, stable session URLs, durable branch selection,
independent session renaming, or analytics that cannot be derived cheaply, then
write a separate Convex migration plan. Otherwise, keep sessions derived.
