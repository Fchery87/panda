# Chat-First Workspace Information Architecture

> Status: implemented and verified  
> Last updated: 2026-04-27

## Reader And Action

Reader: Panda maintainers and future agents implementing the workspace redesign.

Post-read action: preserve and extend the implemented chat-first workspace
without adding a parallel cockpit, duplicate state model, or editor-first shell.

## Implementation Notes

The workspace redesign is implemented. Current user-facing contracts:

- Desktop primary surface: chat/session timeline.
- Proof surface tabs: `Run`, `Changes`, `Context`, and `Preview`.
- Mobile destinations: `Work`, `Chat`, `Proof`, and `Preview`.
- Chat timeline stages: intent, routing, planning, execution, validation,
  receipt, and next action.
- Session rail state is derived from bounded recent chat and run summaries.
- Run proof and chat timeline share the same bounded run model rather than
  maintaining duplicate agent state.

Verification for the completed redesign included:

- `bun run typecheck && bun run lint && bun run format:check && bun test`
- `npx convex dev --once`
- `bun run test:e2e`

## Purpose

Panda should feel like a chat-first coding workspace inspired by the operational
clarity of Codex- and Claude-style workflows. The user should experience one
coherent session timeline: intent enters through chat, Panda routes it, work
executes, proof accumulates, and the user reviews or continues from the same
thread.

This is not a new dashboard. It is a reorganization of existing Panda surfaces
around the active chat and active run.

## Design Direction

Use `frontend-design` for all UI and design work in this milestone and all later
UI milestones.

The visual tone is calm operational brutalism:

- Sharp structure, explicit state, and precise spacing.
- Chat and run state are visually dominant.
- Files, diffs, terminal, preview, memory, and receipts support the active run.
- Color communicates operational meaning: confidence, risk, approval, blocked,
  running, validation, and completion.
- No decorative cockpit metaphors, glow dashboards, glassmorphism, gradient
  text, nested card walls, or metric-card bloat.

## Primary Model

The workspace is organized around one object: the active session timeline.

```text
User intent
  -> routing decision
  -> plan or clarification
  -> tool activity summary
  -> changed work
  -> validation and recovery
  -> execution receipt
  -> next action
```

The chat thread is not a message log with side panels. It is the operational
record of the session.

## Target Desktop Layout

```text
+----------------------------------------------------------------------------+
| Panda / project                                      branch  run  cost state |
+----------------+------------------------------------------+----------------+
| Session Rail   | Chat / Session Timeline                  | Proof Surface  |
|                |                                          |                |
| Active         | User intent                              | Run            |
| Needs review   |                                          | Changes        |
| Background     | Routing badge                            | Context        |
| Complete       | Code -> high -> review mode              | Preview        |
|                |                                          |                |
| Project        | Assistant response                       | Active view    |
| Files          | plan, edits, questions, status           | shows details  |
| Specs          |                                          | for selected   |
| Memory         | Tool activity groups                     | timeline item  |
|                | summarized by default                    |                |
|                |                                          |                |
+----------------+------------------------------------------+----------------+
| Ask  Plan  Code  Build    oversight    attachments    composer     send     |
+----------------------------------------------------------------------------+
```

### Desktop Hierarchy

1. Center: chat/session timeline. This is the primary work surface.
2. Right: proof surface. It renders run-derived inspection views.
3. Left: quiet session/project rail. It helps return to work without dominating.
4. Bottom: composer. It owns intent entry, mode, oversight, attachments, and
   send.

The center should win the squint test. The right side is strong but secondary.
The left side is a navigation rail, not a task-card dashboard.

## Target Mobile Layout

```text
+--------------------------------+
| Panda / project          state  |
+--------------------------------+
| Chat                           |
|                                |
| User intent                    |
| Routing badge                  |
| Assistant response             |
| Run summary                    |
| Receipt entry point            |
|                                |
+--------------------------------+
| Chat  Work  Run  Preview       |
+--------------------------------+
| composer                       |
+--------------------------------+
```

Mobile keeps chat primary. It does not hide proof or changed work; it moves them
behind clear bottom tabs.

Implemented mobile destinations:

- `Work`: files, changed work, and artifact review.
- `Chat`: conversation timeline and composer.
- `Proof`: progress, recovery, receipt, validation, and context.
- `Preview`: browser/app preview when available.

## Current Surface Mapping

| Current surface     | Target destination            | Notes                                                                    |
| ------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| Chat panel          | Chat / Session Timeline       | Becomes the dominant shell surface.                                      |
| Chat action bar     | Composer                      | Preserve canonical modes and oversight controls.                         |
| Routing badge       | Chat / Session Timeline       | Inline before execution, compact by default.                             |
| Run progress panel  | Run view + timeline summaries | Summaries belong near the chat run; details belong in proof.             |
| Run receipt panel   | Run view                      | Receipt is the durable proof record for each run.                        |
| Artifacts panel     | Changes view                  | Generated files and diffs should be one review path.                     |
| Plan panel          | Run or Context view           | Plans are run context unless actively being edited.                      |
| Memory bank         | Context view                  | Persistent memory should not be equal-weight chrome.                     |
| Evals and QA        | Run view                      | Treat as validation evidence attached to the active run.                 |
| State and decisions | Context or Run detail         | Keep inspectable, but not top-level unless active.                       |
| Browser preview     | Preview view                  | Preserve as a first-class support surface.                               |
| Workbench editor    | Work view                     | Editor supports inspection and spot edits, not the primary mental model. |
| Diff tab            | Changes view                  | Changed work should be reachable from both timeline and proof surface.   |

## Review Surface Consolidation

The proof surface should consolidate existing equal-weight tabs into fewer
views. Preferred direction:

```text
Run | Changes | Context | Preview
```

### Run

Purpose: answer “what happened, what is happening, and can I trust it?”

Contains:

- Active run state.
- Timeline detail.
- Recovery checkpoints.
- Delegated subagent activity.
- Receipt summary.
- Validation and QA evidence.
- Approval history.

### Changes

Purpose: answer “what changed and what can I accept, reject, or inspect?”

Contains:

- Artifacts.
- Diffs.
- Generated files.
- Pending applied/rejected work.
- File jump actions.

### Context

Purpose: answer “what did Panda know or use?”

Contains:

- Memory bank.
- Plan context.
- Specification state.
- Context audit.
- Decisions and relevant state.

### Preview

Purpose: answer “what does the work look like or do?”

Contains:

- WebContainer/browser preview.
- Runtime status.
- App preview affordances.
- Future design-mode hooks, if separately scoped.

## Session Rail

The session rail should be quiet and operational. It is not a card grid.

Recommended groups:

- `Active`: the current chat/run.
- `Needs review`: blocked, waiting for approval, failed, or completed with
  changes pending review.
- `Background`: work running or resumable elsewhere.
- `Complete`: recent completed sessions.

Each item should show only enough state to return to work:

- Short title or first user intent.
- Status marker.
- Last meaningful event.
- Unread or needs-attention indicator.

Avoid showing token counts, long logs, tool lists, or receipt details in the
rail. Those belong in the proof surface.

## Chat Timeline Rules

The chat timeline owns the narrative. Default entries should be compressed and
expandable.

Recommended visible stages:

- User intent.
- Routing decision when useful.
- Plan/clarification state.
- Work summary.
- Changes summary.
- Validation summary.
- Receipt entry point.
- Suggested next action.

Low-level events should not appear as a raw feed by default. They should group
under operational headings such as `Read`, `Changed`, `Ran`, `Validated`, and
`Needs approval`.

## Composer Rules

The composer remains the intent entry point.

It must preserve:

- `ask`, `plan`, `code`, and `build` modes.
- Manual override behavior.
- Oversight level.
- Attachments.
- Stop/recover behavior where currently available.

Routing can make the default path smarter, but manual selection must remain
obvious and authoritative.

## Woven Implementation Rules

Use the existing run architecture as the source of truth:

- The agent hook owns send, route, run, event, and terminal lifecycle behavior.
- Agent runs own durable status, events, receipt, checkpoints, and summaries.
- Run progress and receipt components render proof from those run records.
- The review/proof surface receives slot content and should not invent separate
  agent state.
- WebContainer state informs proof and preview but must not become a global mode
  blocker.

Avoid these anti-patterns:

- New cockpit route or command-center shell.
- Duplicate run state stored separately for the redesign.
- Raw logs as the default user experience.
- Equal-weight tabs for every backend concept.
- Editor-first hierarchy where chat becomes a sidebar.
- Session rail full of large identical task cards.

## Acceptance For Milestone 1

Milestone 1 is complete when:

- The primary surface is clearly defined as the chat/session timeline.
- Existing Panda surfaces are mapped into the target IA.
- The proof surface consolidation direction is documented.
- Desktop and mobile diagrams exist.
- The implementation rules make clear how to keep this woven into current Panda
  architecture.
- The plan avoids dashboard bloat and AI-slop visual patterns.
