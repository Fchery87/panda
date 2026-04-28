# Status: Panda Architecture Contract Hardening

## Current milestone: Complete

## Final implementation gate: PASS — 2026-04-28

- `bun run typecheck`: PASS, 2/2 packages successful.
- `bun run lint`: PASS, 1/1 package successful.
- `bun run format:check`: PASS, all matched files use Prettier code style.
- `bun test`: PASS, 1063 pass, 0 fail, 2911 expect() calls.
- Full `bun test` output saved to
  `/home/nochaserz/.local/share/opencode/tool-output/tool_dd64caa67001rbJaCUYMUe7bcW`.

## Last completed: Milestone 5 — Wiring And Reader Test — 2026-04-28

## Final gate: PASS — 2026-04-28

- `bun run typecheck`: PASS, 2/2 packages successful
- `bun run lint`: PASS, 1/1 package successful
- `bun run format:check`: PASS after formatting changed Markdown files
- `bun test`: PASS, 1055 pass, 0 fail, 2853 expect() calls

## Decision log

- Reader is Panda maintainers and future agents because this sprint hardens
  contribution and implementation contracts.
- Post-read action is making architecture decisions from one vocabulary and one
  ownership map.
- Scope is docs and small alignment fixes first; larger runtime or Convex
  implementation work is logged as future work.
- Added Architecture Contract as canonical vocabulary and source-of-truth map.
- Added Security And Trust Boundaries as the authorization, redaction, sharing,
  token, MCP, and telemetry policy.
- Added Convex Backend Governance as the ownership, query-shape, retention, and
  legacy API policy.
- Replaced active browser-only/web-only positioning with browser-first plus
  server fallback.
- Updated mode-hardening docs from pure proposal to partially implemented
  architecture record.
- Reader-test confirmed the new docs are linked from entry points and active
  docs no longer claim browser-only/web-only positioning.
- Formatted the executive action plan because the repository-wide format gate
  includes it.
- Follow-up pass addressed the full doc-by-doc assessment: AGENTS now delegates
  to canonical docs, Convex README has lifecycle invariants, harness delivery
  tables are marked current vs target, WebContainer has support/mount/telemetry
  policy, transcript policy includes sharing/reasoning/redaction, provider
  catalog is aligned with the model capability manifest, and archive/root
  artifact guidance is stronger.
- S05 retention cleanup is implemented as an internal bounded Convex mutation
  with scheduled cron entry because operational data must be deleted in batches,
  not via unbounded collection scans.
- S06 agent run lifecycle transitions are enforced before terminal writes
  because completed, failed, and stopped runs should not be rewritten by late
  callbacks.
- S07 provenance summary is exposed as a bounded Convex query so proof surfaces
  can tie latest spec, planning session, verification, and run receipt without
  subscribing to full histories.
- S08 permission audit reads are bounded and project-scoped because approval
  decisions must be reviewable without unbounded session history scans.
- S09 WebContainer boot telemetry is redacted into categorical status, execution
  path, duration, and reason fields so fallback behavior is observable without
  storing raw boot errors.

## Implementation slice validation

- S05 retention focused test: PASS, `bun test convex/retention.test.ts`, 1 pass,
  0 fail, 9 expect() calls.
- S05 typecheck: PASS, `bun run typecheck`, 2/2 packages successful.
- S06 agent run persistence focused test: PASS,
  `bun test convex/agentRuns.persistence.test.ts`, 1 pass, 0 fail, 30 expect()
  calls.
- S06 typecheck: PASS, `bun run typecheck`, 2/2 packages successful.
- S07 provenance focused test: PASS, `bun test convex/provenance.test.ts`, 1
  pass, 0 fail, 8 expect() calls.
- S07 typecheck: PASS, `bun run typecheck`, 2/2 packages successful.
- S08 permission audit focused test: PASS,
  `bun test convex/permissionAuditLog.test.ts`, 1 pass, 0 fail, 10 expect()
  calls.
- S08 typecheck: PASS, `bun run typecheck`, 2/2 packages successful.
- S09 WebContainer boot focused test: PASS,
  `bun test apps/web/lib/webcontainer/boot.test.ts`, 2 pass, 0 fail, 2 expect()
  calls.
- S09 typecheck: PASS, `bun run typecheck`, 2/2 packages successful.

## Known issues

- `mgrep` search is unavailable due quota, so inspection uses targeted read and
  grep fallback.
- Remaining browser-only/web-only hits are in this task plan/spec and the
  executive findings document, where they describe the old issue.

## Future work (out of scope)

- Convert runtime string termination errors into persisted typed termination
  reasons.
- Enforce approved-plan preflight only for build-from-plan execution paths.
- Add or reconcile missing grammar adapter IDs referenced by the model manifest.
- Deprecate or remove legacy broad Convex queries after caller inventory.
- Revisit retention duration defaults and table-specific policies once product
  retention requirements are finalized.
- Remove or archive root `SPEC.md`, `PLAN.md`, and `STATUS.md` after maintainer
  approval if they should not be committed as audit evidence.
