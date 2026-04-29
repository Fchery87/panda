# Spec: Architecture Deepening Program

## Deliverables

- [ ] Deepen `Run` orchestration into a Module that owns lifecycle ordering for
      one Run while preserving current behavior.
- [ ] Simplify the `Plan` and `Spec` relationship so Plan owns execution intent
      and Spec provides verification context for a Run.
- [ ] Deepen `Run Projection` into a Module that produces policy-correct chat,
      proof, and public-share projections from live and persisted Run facts.
- [ ] Deepen the harness `Runtime` internals by extracting tool execution
      scheduling decisions into a planner-first Module.
- [ ] Deepen `Runtime Command Execution` into an Adapter-backed Seam for
      WebContainer and server-backed execution paths.
- [ ] Split the `Workspace Runtime Interface` by product concept, starting with
      runtime availability.
- [ ] Deepen Convex query Modules so active UI uses summary/detail-specific
      Interfaces and broad legacy paths are compatibility-only.

## Constraints

- Preserve the canonical modes: `ask`, `plan`, `code`, and `build`.
- Preserve browser-first with server fallback behavior.
- Preserve current Run lifecycle behavior during the first extraction.
- Do not move provider stream parsing, low-level tool invocation, UI rendering,
  Convex query policy, or WebContainer command execution into Run orchestration.
- Keep chat projections summary-shaped and proof projections bounded/redacted.
- Public share projections must not expose owner-only execution detail, raw
  reasoning, provider secrets, signed URLs, private files, or checkpoint
  payloads.
- Active Convex UI paths must prefer bounded, indexed, summary-shaped,
  paginated, or lazy detail Interfaces.
- Use the architecture vocabulary in `CONTEXT.md` and canonical docs in `docs/`.

## Out Of Scope

- Replacing the high-level harness `Runtime` Interface.
- Changing product behavior while extracting Run orchestration.
- Introducing a separate Spec approval lifecycle without a future explicit
  product requirement.
- Removing compatibility Convex Interfaces before caller inventory and a safe
  migration window.
- Redesigning React visual layout while splitting workspace runtime concepts.
