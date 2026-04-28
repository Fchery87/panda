# Panda.ai Executive View and Action Plan

## Executive View

Panda is a browser-first AI coding workbench with a strong architectural
foundation and unusually mature thinking around planning, approvals, execution
receipts, bounded reactive data, and browser/runtime fallback
behavior.[cite:36][cite:47][cite:52]

The project’s main weakness is not lack of ambition or product direction. The
real issue is contract drift: multiple documents use overlapping but
inconsistent vocabulary for modes, agents, runtime roles, truth ownership, and
execution boundaries, which increases implementation risk and makes the current
architecture harder to reason about consistently.[cite:36][cite:47]

The reviewed documentation shows several real strengths:

- The product workflow is coherent: direct the AI, review a plan, approve,
  execute, inspect evidence, and share results.[cite:36]
- The Convex data strategy is disciplined: narrow live queries, bounded
  payloads, pagination, and detail-on-demand are all consistent with Convex
  scaling guidance.[cite:36][cite:70][cite:72]
- The runtime strategy is pragmatic: browser execution is preferred when
  WebContainer can boot, but the product remains usable through a server-backed
  fallback path when browser isolation requirements are
  unavailable.[cite:52][cite:129]
- The mode-hardening proposal is technically strong and addresses real
  production failure classes such as stale mode state, leaked tool-call grammar,
  and opaque termination reasons.[cite:52]

The most important conclusion is that Panda is past the stage where more product
surface area should be the priority. The next stage should be architecture
hardening, vocabulary unification, and trust-boundary
clarification.[cite:36][cite:47]

## Core Findings

### Product Positioning

The project should no longer describe itself as browser-only or web-only. The
runtime behavior described for WebContainer support clearly depends on
server-backed fallback when browser-side execution is unsupported or fails, so
the accurate positioning is browser-first with server
fallback.[cite:52][cite:129]

This wording change matters because it aligns the product promise with actual
runtime behavior and removes a credibility leak from the current documentation
and implementation story.[cite:52]

### Documentation Drift

The reviewed materials describe similar concepts using different names. This is
the largest non-code problem in the project because vocabulary drift creates
bugs, inconsistent UI labels, and confusion about what is
canonical.[cite:36][cite:47]

The repo currently mixes terms such as mode, role, agent, architect, builder,
build, code, planning session, plan artifact, and execution contract without one
explicit glossary or authority map.[cite:36][cite:47]

### Runtime Hardening Need

The strongest technical document is the mode-hardening proposal. Its
grammar-registry, model-manifest, stream-sanitizer, preflight, and typed-error
architecture is exactly the kind of fail-closed system required for
multi-provider AI execution.[cite:52]

This is also the clearest sign that the product has encountered real runtime
fragility and now needs stronger contracts rather than more implicit assumptions
about provider behavior.[cite:52]

### Backend Maturity

The Convex backend shape is promising and broad enough to support a serious
product: projects, files, chats, planning sessions, runs, events, sharing,
specs, evals, and provider configuration are all present in the backend
model.[cite:36]

However, the backend documentation still reads more like an inventory than a
governed system. It needs explicit ownership rules, authorization boundaries,
index strategy, retention policy, and hot-versus-cold data
policy.[cite:36][cite:47][cite:70][cite:72]

### Security and Trust Boundaries

The current documentation is better at describing workflow than at describing
trust boundaries. A product with admin controls, share links, provider tokens,
runtime execution, attachments, and MCP integrations needs explicit rules for
auth, authorization, secret handling, telemetry redaction, and share-surface
exclusions.[cite:47][cite:54]

This is especially important because Next.js and Convex both benefit from
defense-in-depth: auth should be rechecked at the data and action boundary, not
only assumed from route-level UI access.[cite:47][cite:54]

## Highest-Priority Contradictions

| Contradiction                                                                                | Why it matters                                                          | Recommended fix                                                |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| Browser-only wording vs server-backed fallback runtime.[cite:52][cite:129]                   | Misstates the actual product architecture and weakens trust.            | Replace with “browser-first with server fallback.”             |
| Mode / role / agent vocabulary drift.[cite:36][cite:47]                                      | Leads to stale assumptions in UI, docs, analytics, and tests.           | Publish one glossary and enforce it everywhere.                |
| Convex as source of truth vs mirrored compatibility fields.[cite:36][cite:47]                | Creates dual-state risk and stale-read risk.                            | Document canonical ownership and deprecate mirrors explicitly. |
| Planning truth spread across sessions, artifacts, specs, and messages.[cite:36][cite:47]     | Makes approval and execution rules harder to enforce consistently.      | Add precedence and invariants for planning data.               |
| Strong execution system without equally strong documented security policy.[cite:47][cite:54] | Increases risk around sharing, provider tokens, MCP, and admin actions. | Add explicit security and trust-boundary documentation.        |

## Prioritized Action Plan

### P0 — Fix Immediately

These items should be treated as the highest-priority implementation and
documentation work.

| Priority | Action                                                                                                                                                                         | Outcome                                                                                    | Dependencies                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------- |
| P0       | Publish a canonical glossary for mode, agent, role, run, receipt, checkpoint, plan artifact, planning session, spec, delivery state, and execution contract.[cite:36][cite:47] | Removes the largest cross-doc contradiction and stabilizes future implementation language. | None                          |
| P0       | Replace “browser-only / web-only” wording with “browser-first with server fallback.”[cite:52][cite:129]                                                                        | Makes product positioning truthful and aligned with runtime behavior.                      | None                          |
| P0       | Create a source-of-truth map for chat mode, approved plan, active spec, run state, receipt, share state, and runtime status.[cite:36][cite:47]                                 | Clarifies canonical ownership and reduces dual-state bugs.                                 | Glossary                      |
| P0       | Implement ModeContract, ModeContext, and ModeTransitionRitual from the mode-hardening proposal.[cite:52]                                                                       | Fixes stale mode labels, bad handoffs, and mode-specific rendering defects.                | Glossary, source-of-truth map |
| P0       | Implement manifest-driven model compatibility plus grammar adapters and sanitizer enforcement.[cite:52]                                                                        | Prevents raw tool-call leakage and fail-open execution behavior.                           | Mode hardening architecture   |
| P0       | Define backend authorization rules for admin, sharing, settings, provider tokens, MCP, evals, and runtime actions.[cite:47][cite:54]                                           | Protects sensitive backend surfaces at the actual enforcement boundary.                    | Source-of-truth map           |
| P0       | Define transcript, reasoning, telemetry, and share-surface redaction rules.[cite:47][cite:54]                                                                                  | Prevents sensitive content from leaking through UI, logs, or public sharing.               | Authorization model           |

### P1 — Next Phase

These should follow immediately after the P0 contract cleanup.

| Priority | Action                                                                                                                        | Outcome                                                        | Dependencies          |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------- |
| P1       | Publish explicit state machines for planning sessions, agent runs, approvals, retries, and resume flows.[cite:36][cite:47]    | Prevents illegal transitions and frontend/backend divergence.  | Source-of-truth map   |
| P1       | Document provider token, OAuth token, and secret handling policy.[cite:54]                                                    | Clarifies storage, redaction, exposure, and operational rules. | Authorization model   |
| P1       | Add retention and archival policy for run events, checkpoints, analytics, file snapshots, and eval results.[cite:36][cite:70] | Controls growth and long-term backend cost.                    | Source-of-truth map   |
| P1       | Add index and pagination strategy for growth-heavy tables.[cite:70][cite:72][cite:125]                                        | Makes Convex query performance guidance actionable.            | Backend ownership map |
| P1       | Split AGENTS.md into operating contract vs reference material.[cite:36]                                                       | Reduces drift and keeps contributor rules enforceable.         | Glossary              |
| P1       | Add typed termination reasons and watchdog rules to runtime execution.[cite:52]                                               | Replaces opaque timeouts with actionable diagnostics.          | Mode hardening work   |
| P1       | Publish a WebContainer browser compatibility matrix and failure policy.[cite:52][cite:129]                                    | Sets realistic expectations for runtime support and debugging. | None                  |

### P2 — Advancement Work

These should follow once architecture and trust boundaries are stable.

| Priority | Action                                                                                   | Outcome                                                                      | Dependencies                        |
| -------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------- |
| P2       | Add spec-to-plan-to-run provenance linking.[cite:36][cite:47]                            | Makes file changes and runtime decisions explainable in the UI.              | P0 state ownership + mode hardening |
| P2       | Add branch / fork / compare flows for plans and runs.[cite:36]                           | Improves iterative development and review workflows.                         | State machines                      |
| P2       | Add policy-driven approvals for commands, MCP tools, and write scopes.[cite:47]          | Turns safety prompts into reusable organization rules.                       | Authorization + permissions model   |
| P2       | Add WebContainer observability and fallback telemetry with redaction.[cite:52][cite:129] | Makes browser-runtime failures measurable and debuggable.                    | Redaction policy                    |
| P2       | Add coverage-by-change-type testing policy.[cite:36]                                     | Prevents overreliance on expensive E2E coverage and improves sustainability. | AGENTS cleanup                      |
| P2       | Add an archive convention for historical docs and plans.[cite:36]                        | Keeps docs useful without allowing stale files to act as current authority.  | Glossary + docs authority map       |

## Recommended Implementation Sequence

The recommended sequence is:

1. Canonical glossary.[cite:36][cite:47]
2. Browser-first wording cleanup.[cite:52][cite:129]
3. Source-of-truth map.[cite:36][cite:47]
4. Authorization and redaction policy.[cite:47][cite:54]
5. Mode hardening implementation.[cite:52]
6. State machine publication.[cite:36][cite:47]
7. Backend retention, indexing, and pagination
   documentation.[cite:70][cite:72][cite:125]
8. AGENTS and docs cleanup.[cite:36]
9. Advancement features.[cite:36][cite:47][cite:52]

This order matters because implementing runtime hardening before vocabulary and
truth ownership are stabilized risks hardening the wrong
abstractions.[cite:36][cite:47]

## Suggested Deliverables

### Milestone 1 — Contract Lock

Deliverables:

- One canonical glossary document
- One source-of-truth map
- Top-level README and docs wording cleanup
- Security / redaction / authorization overview
- Docs authority and archive policy

Acceptance criteria:

- All reviewed docs use one vocabulary consistently.[cite:36][cite:47]
- No document still claims Panda is browser-only.[cite:52][cite:129]
- Sensitive surfaces have documented backend enforcement
  rules.[cite:47][cite:54]

### Milestone 2 — Runtime Hardening

Deliverables:

- ModeContract and ModeContext
- ModeTransitionRitual
- Tool-call grammar registry
- Model capability manifest
- Stream sanitizer
- Typed compatibility error surfaces
- Typed termination reasons and watchdog behavior

Acceptance criteria:

- Build and Builder modes cannot run against unmanifested models.[cite:52]
- Raw tool-call grammar never reaches UI display text.[cite:52]
- Mode-switch state bugs are eliminated by design.[cite:52]

### Milestone 3 — Backend Governance

Deliverables:

- State machine docs for planning and runs
- Retention and archival policy
- Index and pagination policy
- Token and secret handling policy
- Share-link and attachment exposure contract

Acceptance criteria:

- Growth-heavy queries are explicitly bounded, paginated, or
  indexed.[cite:36][cite:70][cite:72]
- Sensitive token/storage paths have documented policy.[cite:47][cite:54]
- Sharing behavior is explicit and redaction-safe.[cite:47]

## Readiness Assessment

Panda does not look like an early-stage toy. It looks like a product with real
architectural depth, real runtime pain points, and the beginnings of strong
operational discipline.[cite:36][cite:47][cite:52]

The current readiness level is best described as **architecturally promising but
governance-incomplete**. The next step is not more breadth. The next step is to
make vocabulary, ownership, and trust boundaries as rigorous as the
implementation ideas already are.[cite:36][cite:47][cite:54]

## Bottom Line

The project should prioritize a short architecture-hardening sprint over new
feature expansion.[cite:36][cite:47]

The right immediate move is a one-week P0 sprint focused on:

- canonical vocabulary,
- source-of-truth ownership,
- security and redaction rules,
- browser-first positioning cleanup,
- and implementation of the mode-hardening runtime
  contract.[cite:47][cite:52][cite:129]

That sequence will improve product trust, reduce implementation ambiguity, and
give downstream LLM-assisted work a much stronger execution
contract.[cite:36][cite:47][cite:52]
