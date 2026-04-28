# Spec: Panda Architecture Contract Hardening

## Reader And Action

Reader: Panda maintainers and future agents landing cold in the codebase.

Post-read action: make documentation and implementation decisions using one
shared vocabulary, one source-of-truth map, and explicit trust-boundary rules.

## Deliverables

- [x] Publish a canonical glossary for modes, agents, runs, planning, receipts,
      checkpoints, delivery state, and execution contracts
- [x] Publish a source-of-truth map for mode, plan, spec, run, receipt, share,
      runtime, provider, and delivery state
- [x] Replace browser-only and web-only wording with browser-first with server
      fallback
- [x] Publish security, redaction, authorization, sharing, token, and telemetry
      rules
- [x] Publish backend governance rules for Convex ownership, query shape,
      retention, and legacy API handling
- [x] Update mode-hardening docs to reflect partial implementation and remaining
      work
- [x] Wire new docs into README and docs index
- [x] Run validation and repair failures
- [x] Complete doc-by-doc assessment follow-ups for AGENTS, Convex, harness,
      WebContainer, transcript, provider catalog, historical docs, and root
      artifacts

## Constraints

- Keep this pass focused on contract, docs, and small alignment fixes
- Do not introduce schema changes or migrations in this sprint
- Do not remove legacy APIs unless caller inventory proves they are unused
- Keep the canonical 4-mode workflow: `ask`, `plan`, `code`, `build`
- Preserve browser-first positioning with server-backed fallback
- Do not document secrets, raw token values, or implementation-sensitive
  examples

## Out of scope (log here during the run, do not act on)

- Full runtime implementation beyond documentation/status alignment
- Removing deprecated Convex functions
- Adding retention cron jobs or archival workers
- Adding new grammar adapters beyond documenting the current implementation
  state
- Reworking UI copy outside the architecture contract vocabulary
