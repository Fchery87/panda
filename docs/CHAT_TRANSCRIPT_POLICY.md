# Chat Transcript Policy

This document defines what belongs in Panda's main chat transcript versus the
proof surfaces.

## Main rule

The main chat is the session timeline. It should answer one of these questions:

- What is the assistant doing?
- What does it need from me?
- What changed?
- What should I review next?

If a line does not answer one of those questions, it belongs in a proof surface.

The current proof surfaces are:

- `Run` - progress, validation evidence, recovery state, approvals, and
  receipts.
- `Changes` - artifacts, diffs, generated files, and review actions.
- `Context` - plans, memory, specs, and context audit state.
- `Preview` - browser/runtime preview.

## Surfaced Panda modes

The Panda front-end currently exposes the canonical 4-mode workflow:

- `ask`
- `plan`
- `code`
- `build`

Legacy labels such as `Architect`, `Build`, or `Builder` can appear in older
plans or compatibility code. Current transcript and proof behavior should be
described in terms of the canonical mode values.

## By mode

### Plan

- Allow in chat: intent understanding, structured plan, assumptions, review and
  approval actions
- Keep in inspector: tool activity, raw progress events, snapshots, debug labels

### Code

- Allow in chat: concise progress summaries, changed-file or artifact summaries,
  approvals
- Keep in proof: tool calls, detailed execution trace, snapshots, raw progress
  categories

### Build

- Allow in chat: milestone summaries, blockers, validation summaries, approvals,
  outcomes, receipt entry points, and next action
- Keep in proof: tool calls, snapshots, progress steps, skill matches, raw event
  categories, and full receipt details

## Internal mode note

- `ask` remains conversational and read-only.
- `plan` produces planning, clarifications, and reviewable plan state.
- `code` is direct implementation work.
- `build` is full-access execution work with stronger proof and validation
  expectations.

## Timeline stages

Chat timeline rows should be derived from the bounded run timeline contract:

- intent
- routing
- planning
- execution
- validation
- receipt
- next action

The transcript should summarize these stages by default. The `Run` proof surface
owns detailed event inspection.

## Never show in the main transcript

- Raw tool names like `list_directory`
- Event categories like `analysis` or `other`
- Snapshot bookkeeping like `Step 1 snapshot created`
- Skill matching diagnostics
- Duplicate approval or status cards already represented in dedicated action
  surfaces
