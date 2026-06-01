# Chat Transcript Policy

This document defines what belongs in Panda's main chat transcript versus run
evidence, inspection, and public share surfaces.

For the broader trust-boundary rules that govern this policy, see
[Security And Trust Boundaries](./SECURITY_TRUST_BOUNDARIES.md). For canonical
mode vocabulary, see [Architecture Contract](./ARCHITECTURE_CONTRACT.md).

## Main rule

The main chat is the session timeline. It should answer one of these questions:

- What is the assistant doing?
- What does it need from me?
- What changed?
- What should I review next?

If a line does not answer one of those questions, it belongs in an inspector
surface.

The current inspector surfaces are:

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
plans or compatibility code. Current transcript and run-evidence behavior should
be described in terms of the canonical mode values.

## By mode

### Plan

- Allow in chat: intent understanding, structured plan, assumptions, review and
  approval actions, plan checklist (Windsurf-style progress tracker)
- Keep in inspector: tool activity, raw progress events, snapshots, debug labels

### Code

- Allow in chat: collapsed tool-chip summaries (e.g. `Edited 3 · Ran 2`), plan
  checklist, approvals
- Keep in Run: tool calls, detailed execution trace, snapshots, raw progress
  categories, full receipt details

### Build

- Allow in chat: collapsed tool-chip summaries, plan checklist, approvals,
  blockers, validation outcomes
- Keep in Run: tool calls, snapshots, progress steps, full Applied Skill
  summaries, raw event categories, and full receipt details

Tool chips show a one-line collapsed summary of completed tool activity grouped
by type (edits, commands, searches, reads). Users click to expand and see
per-tool details including file paths and durations. This follows the
Cursor-style pattern where the chat stays clean and operational detail is
opt-in.

Plan checklist shows step-by-step progress with completed/active/pending states
as a collapsed badge (e.g. `Plan 2/4 · in progress`). Users click to expand and
see each step. This follows the Windsurf Cascade pattern for plan visibility.

## Internal mode note

- `ask` remains conversational and read-only.
- `plan` produces planning, clarifications, and reviewable plan state.
- `code` is direct implementation work.
- `build` is full-access execution work with stronger run-evidence and
  validation expectations.

## Chat transcript elements

The chat transcript keeps user and assistant messages as the primary content.
Operational detail is surfaced through two collapsed inline elements:

**Tool chips** (code + build modes) — Collapsed inline chips that group
completed tool calls by type: `Edited 3 · Ran 2`. Click to expand per-tool
details with file paths, durations, and errors. Keeps the chat conversational
while making tool activity glanceable.

**Plan checklist** (all modes when a plan exists) — A collapsed progress badge
like `Plan 2/4 · in progress`. Click to expand a step-by-step checklist with ✅
completed, ⏳ active, and ○ pending states. Gives plan visibility without
cluttering the chat.

The `Run` inspector panel carries detailed execution trace, receipt, and
snapshot data. They are not duplicated in the chat transcript.

## Never show in the main transcript

- Raw tool names like `list_directory`
- Event categories like `analysis` or `other`
- Snapshot bookkeeping like `Step 1 snapshot created`
- Skill matching diagnostics
- Full Custom Skill instructions, checklists, and required-validation text
- Duplicate approval or status cards already represented in dedicated action
  surfaces

## Reasoning And Storage Rules

Reasoning content is sensitive by default. It may help trusted users understand
a run, but it can contain private prompt context, intermediate assumptions, or
model-specific artifacts.

- Store or render reasoning only when a trusted feature explicitly needs it.
- Keep reasoning out of public shared-chat projections.
- Prefer bounded summaries over raw reasoning in chat timeline rows.
- Treat raw reasoning like run-evidence/inspection data, not transcript
  narrative.

## Share Surface Rules

Shared chats are public read-only projections. They are not the owner workspace
and must not expose Run inspector internals.

Allowed in public shared chat:

- Redacted message role, content, and creation time.
- Chat title, mode, creation time, and shared time.

Not allowed in public shared chat:

- Raw tool calls, tool arguments, command output, runtime checkpoints, full
  receipts, private memory, provider settings, provider tokens, signed
  attachment URLs, project policy state, admin state, raw reasoning, or private
  file contents.

Shared transcript loading should be paginated or explicitly capped. Legacy
all-message share queries are compatibility paths and should not be used by
active public UI.

## Redaction Rules

Before content enters chat, Run inspector surfaces, logs, telemetry, or public
sharing, redact:

- API keys, OAuth tokens, refresh tokens, bearer tokens, cookies, and Convex
  admin keys.
- Authorization headers, signed URLs, private base URLs, and credential-like
  environment variable values.
- Tool arguments or command output that include private file contents or
  secrets.

If redaction cannot be guaranteed, keep the content in owner-only inspection or
omit it from the transcript entirely.

## Mode Handoff Transcript Policy

Panda may carry task state across Ask, Plan, Agent Guided, and Agent Autopilot.
This is done through structured prompt context, not by fabricating user
messages.

When a user says “save this plan,” “implement the plan,” or “use your audit
findings,” Panda should resolve the referenced prior artifact/message and inject
a `ModeHandoffPacket` into system context for the next run.

Transcript rules:

- Preserve original user/assistant messages as authored.
- Do not insert synthetic user messages to restate plans or audits.
- Approved structured plans are preferred over inferred chat text.
- If Panda cannot identify the referenced plan/audit, it should ask for
  clarification instead of guessing.
- Message and plan chunks may be indexed as retrieval sources with source types
  `message` and `plan`, subject to project ownership checks.

Current runtime mapping:

```txt
Ask                → ask
Plan               → plan
Agent · Guided     → code
Agent · Autopilot  → build
```
