# Convex Backend Governance

> Last updated: April 28, 2026
>
> Reader: Panda maintainers and future agents changing Convex tables, queries,
> mutations, actions, payload shape, retention, or backend docs.
>
> Post-read action: classify the data owner, query shape, access pattern, and
> retention expectation before changing backend behavior.

## Purpose

Panda uses Convex as the persistent source of truth for projects, files, chats,
planning, runs, sharing, settings, provider configuration, MCP configuration,
evals, and delivery state. Because Convex live queries resend payloads when data
changes, backend API shape is both a correctness contract and a
product-performance contract.

## Ownership Classes

| Class               | Examples                                                                           | Authorization rule                                             |
| ------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| User-owned          | Settings, provider connections, subagents, MCP servers                             | Current authenticated user only, subject to admin policy.      |
| Project-owned       | Projects, files, chats, messages, plans, specs, jobs, runs, artifacts, attachments | Project owner only unless a redacted public projection exists. |
| Admin-owned         | Admin settings, audit logs, global defaults, registration and maintenance controls | Admin only.                                                    |
| Public projection   | Shared chat header and paginated shared messages                                   | Public by share ID, redacted and limited.                      |
| Operational summary | Run summaries, event summaries, payload metrics, session rail state                | Owner-only unless explicitly public, always bounded.           |

New tables must declare their ownership class before they are used from the UI.

## Query Shape Classes

| Class                      | Rule                                                | Suitable use                                                                    |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| Hot live query             | Bounded, indexed, summary-shaped, no large payloads | Project boot, active chat, session rail, run progress.                          |
| Lazy detail query          | Owner-checked and fetched only on interaction       | File content, checkpoint payloads, attachment signed URLs, full receipt detail. |
| Paginated query            | Uses cursor pagination and stable ordering          | Transcripts, history drawers, public shares, long event streams.                |
| Admin query                | Admin-only and bounded, with explicit limits        | User lists, analytics slices, audit review.                                     |
| Mutation cascade           | May scan/delete related rows in controlled batches  | Project/chat deletion and cleanup.                                              |
| Legacy compatibility query | Existing broad path retained temporarily            | Must not be used by active hot UI and should have a removal plan.               |

Avoid `.collect()` on user-growing or project-growing tables unless the query is
clearly admin-only, bounded by a small owner-scoped set, part of a mutation
cascade, or marked legacy with a replacement.

## Hot Data Versus Cold Data

Hot data is loaded during normal workspace operation. Keep it slim.

Hot data includes:

- Project metadata.
- File metadata.
- Recent chat summaries.
- Paginated active transcript metadata.
- Run summaries and event summaries.
- Receipt metadata.
- Runtime availability status.

Cold data is loaded only when the user asks for detail or recovery.

Cold data includes:

- Full file contents.
- Full transcript history beyond the active page.
- Attachment signed URLs.
- Full command output.
- Full checkpoint payloads.
- Full receipt internals.
- Eval result bodies and private prompt/response content.

## Index Strategy

Every query used in product UI should have a matching index for its access
pattern. Index names should include all indexed fields in order.

When adding a query, document:

- The table.
- The owner filter.
- The index used.
- The sort order.
- The maximum result size or pagination behavior.
- Whether the payload can grow with project size, chat length, attachments,
  runs, or time.

If a query cannot be efficiently indexed, keep it off hot paths and document
why.

## Payload Rules

- Project boot must not subscribe to all file contents.
- Active transcript views should use paginated message queries.
- Attachment lists should return metadata by default; signed URLs are lazy
  detail.
- Run progress should use summaries and bounded event lists by default.
- Checkpoint payloads are recovery data, not timeline data.
- Public shared transcripts should be paginated or capped.
- Provider catalog hydration should not persist newly discovered providers as
  enabled.

## Retention Policy

These are current policy targets. Implementation may require follow-up jobs or
migrations.

| Data                                                               | Default retention target                                                                  | Notes                                                     |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Current files, projects, chats, messages, planning sessions, specs | Retain until user deletes project/chat or future export/delete tools apply                | Product source of truth.                                  |
| File snapshots                                                     | Retain recent useful history; archive or compact older snapshots later                    | Needs explicit product setting before automatic deletion. |
| Agent run summaries and receipts                                   | Retain with chat/project until deletion                                                   | Needed for audit and proof.                               |
| Agent run event details                                            | Retain bounded detail; summarize or archive older verbose events later                    | Do not keep unbounded raw event payloads forever.         |
| Runtime checkpoints                                                | Retain recent resumable checkpoints; expire stale checkpoints after policy is implemented | Checkpoints can be large and should not be hot data.      |
| Attachments                                                        | Retain with owning message/chat until deletion                                            | Signed URLs remain lazy and authorized.                   |
| Provider tokens                                                    | Retain until user disconnects or token expires and cleanup is implemented                 | Never expose raw values.                                  |
| Audit logs                                                         | Retain longer than user activity logs                                                     | Audit entries must be redacted.                           |
| Analytics and eval results                                         | Retain bounded summaries by default; archive detailed results later                       | May contain prompts and responses.                        |

Until retention workers exist, new code must avoid making retention problems
worse by writing unbounded large data to hot tables.

## Legacy API Handling

A legacy query or mutation can remain temporarily when external callers or
migration risk are unknown. It must meet these rules:

- Active UI should prefer the bounded replacement.
- Tests should guard that hot UI does not regress to the legacy broad path.
- Docs should label the old path as compatibility-only.
- Removal should wait for caller inventory and a safe migration window.

## Backend Change Checklist

Before changing Convex code, answer:

- Which ownership class applies?
- Which authorization helper or admin check enforces access?
- Is this hot, lazy detail, paginated, admin, cascade, or legacy?
- Is the query indexed in the order it filters and sorts?
- Can the result grow with user activity or project size?
- Does the result include file contents, raw events, signed URLs, tokens, tool
  arguments, command output, or reasoning?
- Should this be summarized, paginated, capped, or fetched lazily instead?
- Does public sharing need a separate redacted projection?
