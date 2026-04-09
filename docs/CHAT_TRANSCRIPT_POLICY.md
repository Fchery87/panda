# Chat Transcript Policy

This document defines what belongs in Panda's main chat transcript versus the
run inspector.

## Main rule

The main chat should answer one of these questions:

- What is the assistant doing?
- What does it need from me?
- What changed?
- What should I review next?

If a line does not answer one of those questions, it belongs in the inspector.

## Surfaced Panda modes

The Panda front-end currently exposes these user-facing modes:

- `Plan`
- `Build`
- `Builder` (under Advanced)

Internal enum values like `ask` and `code` can still exist in the runtime, but
the transcript contract should be described in terms of the surfaced product
modes.

## By mode

### Plan

- Allow in chat: intent understanding, structured plan, assumptions, review and
  approval actions
- Keep in inspector: tool activity, raw progress events, snapshots, debug labels

### Build

- Allow in chat: concise progress summaries, changed-file or artifact summaries,
  approvals
- Keep in inspector: tool calls, detailed execution trace, snapshots, raw
  progress categories

### Builder

- Allow in chat: milestone summaries, blockers, approvals, outcomes
- Keep in inspector: tool calls, snapshots, progress steps, skill matches, raw
  event categories

## Internal mode note

- Internal `ask` behavior should remain conversational and map to the surfaced
  Build experience when used.
- Internal `code` behavior is the implementation path behind the surfaced Build
  mode.

## Never show in the main transcript

- Raw tool names like `list_directory`
- Event categories like `analysis` or `other`
- Snapshot bookkeeping like `Step 1 snapshot created`
- Skill matching diagnostics
- Duplicate approval or status cards already represented in dedicated action
  surfaces
