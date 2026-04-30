# Panda Architecture Contract

> Last updated: April 28, 2026
>
> Reader: Panda maintainers and future agents making architecture or
> implementation decisions.
>
> Post-read action: use one vocabulary and one ownership map before changing
> modes, planning, runs, receipts, sharing, runtime behavior, provider
> compatibility, or delivery state.

## Purpose

Panda is a browser-first AI coding workbench with server-backed fallback. The
product uses a chat-first workflow, Convex-backed persistence, and a
provider-agnostic agent runtime. This document defines the canonical terms and
ownership rules that keep those systems aligned.

If another document uses older language, this contract wins unless that document
is explicitly marked as historical.

## Canonical Product Positioning

Panda is browser-first:

- Browser execution is preferred when WebContainer is available.
- Server-backed execution remains the fallback when browser isolation, browser
  support, deployment headers, or WebContainer boot fail.
- WebContainer readiness must not globally block `code` or `build` work.

Use the phrase `browser-first with server fallback` in product, architecture,
and setup docs.

## Canonical Modes

The user-facing workflow has exactly four canonical modes:

| Mode    | Meaning               | Tool posture                                     | Primary use                    |
| ------- | --------------------- | ------------------------------------------------ | ------------------------------ |
| `ask`   | Read-only Q&A         | No write or command execution                    | Explain, answer, inspect       |
| `plan`  | Planning and review   | Read-only by default                             | Clarify, scope, produce a plan |
| `code`  | Direct implementation | Write and command capable                        | Make focused code changes      |
| `build` | Full execution        | Strongest write, command, and proof expectations | Execute larger approved work   |

Legacy labels such as `Architect`, `Builder`, or role names must not replace
these mode values in current user-facing docs. They may appear only when
documenting historical plans or internal agent roles.

## Agents, Roles, And Modes

Do not use `mode`, `agent`, and `role` interchangeably.

| Term     | Canonical meaning                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------- |
| Mode     | The user-visible workflow contract: `ask`, `plan`, `code`, or `build`.                                  |
| Agent    | A configured runtime persona or executor selected by the harness.                                       |
| Role     | A delivery-control responsibility such as manager, builder, executive reviewer, QA, or ship gatekeeper. |
| Subagent | A delegated specialist invoked by the main runtime for bounded work.                                    |

Modes define user intent and tool posture. Agents execute. Roles govern delivery
state and review responsibility.

## Planning Terms

| Term               | Canonical meaning                                                            | Owner                                        |
| ------------------ | ---------------------------------------------------------------------------- | -------------------------------------------- |
| Planning session   | The structured intake, generation, approval, and execution state for a plan. | Convex planning state                        |
| Plan artifact      | The generated, reviewable implementation strategy.                           | Planning session output                      |
| Approved plan      | A plan artifact accepted by the user for execution.                          | Planning session execution state             |
| Spec               | Formal requirements, constraints, and acceptance criteria.                   | Spec records                                 |
| Execution contract | The bounded instruction set used by `code` or `build` for a run.             | Runtime prompt plus linked plan/spec context |

The planning session is the canonical planning workflow. Chat-level plan fields
are compatibility mirrors only and must not become the primary source for
approval or execution decisions.

## Runtime Terms

| Term               | Canonical meaning                                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Execution Session  | User-facing work thread for one goal inside a project; currently a derived projection over chat, planning, run, receipt, changed-work, preview, and branch summaries. |
| Run                | One agent execution lifecycle tied to a chat turn or approved plan execution.                                                                                         |
| Run event          | A persisted progress, tool, status, validation, error, or receipt event for a run.                                                                                    |
| Receipt            | A bounded audit record persisted when a run completes, fails, or stops.                                                                                               |
| Checkpoint         | Durable runtime state that enables recovery or resume.                                                                                                                |
| Runtime status     | Browser/server execution availability and current job state.                                                                                                          |
| Termination reason | A typed explanation for why a run ended or stopped needing attention.                                                                                                 |

Execution Session is the product projection the user navigates. It is not a
dedicated persisted table today. Receipts summarize proof. Run events explain
progress. Checkpoints support recovery. They must remain separate because they
have different payload, retention, and display rules.

## Source-Of-Truth Map

| Concern                     | Canonical owner                                                                                                                    | Mirrors or derived views                | Rule                                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Chat mode                   | Chat state in Convex plus runtime mode contract                                                                                    | UI selector, receipt routing fields     | Manual mode selection is authoritative for composer sends.                                                                |
| Execution session           | Derived projection over chat, planning session, run summaries, receipts, changed work, runtime preview state, and branch summaries | Session canvas, session rail, inspector | Do not add a dedicated table until cross-chat continuity, stable session URLs, branch selection, or analytics require it. |
| Mode labels and permissions | Mode contract                                                                                                                      | Buttons, prompts, proof rendering       | Do not scatter mode conditionals across UI or runtime code.                                                               |
| Planning lifecycle          | Planning session state                                                                                                             | Chat badges, run progress, plan tabs    | Plan approval and execution read from planning state first.                                                               |
| Approved plan content       | Generated plan artifact                                                                                                            | Prompt injection, proof surface         | Build-from-plan uses the accepted artifact as primary context.                                                            |
| Active spec                 | Spec records                                                                                                                       | Runtime prompt summary, context surface | Specs constrain execution and verification, not chat memory alone.                                                        |
| Run lifecycle               | Agent run state                                                                                                                    | Session rail, run panel, chat summaries | UI reads summaries by default, not full event streams.                                                                    |
| Run proof                   | Receipt plus bounded event summaries                                                                                               | Chat timeline, proof surface            | Full event details are lazy inspection data.                                                                              |
| Runtime availability        | WebContainer provider and server execution path                                                                                    | Preview/runtime badges                  | Browser failure falls back to server execution.                                                                           |
| Share state                 | Shared-chat records                                                                                                                | Public share page                       | Share output is a redacted public projection, not the owner transcript.                                                   |
| Attachments                 | Attachment metadata and authorized storage URL lookup                                                                              | Message previews                        | Signed URLs are resolved lazily and only for authorized contexts.                                                         |
| Provider config             | User/admin settings plus live catalog hydration                                                                                    | Model selectors                         | Catalog data can hydrate UI but must not auto-enable credentials.                                                         |
| Provider tokens             | Token records scoped to owner                                                                                                      | Provider connection badges              | Never expose raw token values to client or shared surfaces.                                                               |
| Delivery state              | Current run, planning, spec, permission, and receipt records; future dedicated delivery records when implemented                   | Rail, reports, QA/ship views            | Do not document dedicated delivery tables as current schema until they exist.                                             |

## State Machine Inventory

These states are canonical and should be kept explicit in docs and tests:

- Planning session: `intake`, `generating`, `ready_for_review`, `accepted`,
  `executing`, `completed`, `failed`, `stale`.
- Agent run: `running`, `completed`, `failed`, `stopped`.
- Shared chat: private by default, public only through an explicit share record.
- Runtime: `idle`, `booting`, `ready`, `unsupported`, `error` for browser
  execution, with server fallback remaining available.

Any new state must define its owner, legal transitions, user-visible labels, and
whether it is persisted or derived.

## Mode-Hardening Status

Panda has started implementing the mode-hardening architecture:

- Mode contract exists for the canonical modes.
- A runtime mode context helper exists.
- Model capability manifest, preflight checks, grammar registry, stream
  sanitizer, typed compatibility errors, and typed termination types exist.
- Runtime integration has begun for preflight and sanitizer enforcement.

Remaining work:

- Ensure the runtime mode context is the active source for all send and event
  application paths.
- Enforce approved-plan presence only on build-from-plan paths that actually
  require it.
- Persist and render typed termination reasons instead of plain error strings.
- Reconcile manifest grammar IDs with registered grammar adapters.
- Keep regression tests for every grammar leak or mode-state bug.

## Documentation Authority

Use this precedence order when docs disagree:

1. Active contract docs in this directory.
2. Root README and active setup docs.
3. Current implementation records marked implemented and verified.
4. Historical plans and proposals.

Historical plans can explain why a decision was made, but they are not active
authority unless they are updated to point back to this contract.
