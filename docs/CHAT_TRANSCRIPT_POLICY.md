# Chat Transcript Policy

This document defines what belongs in Panda's main chat transcript versus proof,
inspection, and public share surfaces.

For the broader trust-boundary rules that govern this policy, see
[Security And Trust Boundaries](./SECURITY_TRUST_BOUNDARIES.md). For canonical
mode vocabulary, see [Architecture Contract](./ARCHITECTURE_CONTRACT.md).

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
- Keep in proof: tool calls, snapshots, progress steps, full Applied Skill
  summaries, raw event categories, and full receipt details

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
- Treat raw reasoning like proof/inspection data, not transcript narrative.

## Share Surface Rules

Shared chats are public read-only projections. They are not the owner workspace
and must not expose proof internals.

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

Before content enters chat, proof, logs, telemetry, or public sharing, redact:

- API keys, OAuth tokens, refresh tokens, bearer tokens, cookies, and Convex
  admin keys.
- Authorization headers, signed URLs, private base URLs, and credential-like
  environment variable values.
- Tool arguments or command output that include private file contents or
  secrets.

If redaction cannot be guaranteed, keep the content in owner-only inspection or
omit it from the transcript entirely.
