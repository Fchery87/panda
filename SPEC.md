# Spec: Harness File Materialization Review

## Deliverables

- [x] Trace why a simple request to create `/docs` can produce a completion
      receipt that does not appear in the project file tree.
- [x] Review the affected harness, Chat Panel send/run path, and project
      file-system materialization boundaries.
- [x] Fix the root cause without widening mode permissions or changing the
      canonical `ask`, `plan`, `code`, `build` workflow.
- [x] Add or repair regression coverage proving created files/directories are
      reflected through the file tree path used by the UI.
- [x] Record validation evidence and remaining risks.

## Constraints

- Preserve existing uncommitted work.
- Do not loosen permission policy, YOLO/session approval boundaries, or mode
  routing.
- Keep Convex hot queries bounded and metadata-oriented where possible.
- Avoid long-lived dev servers and destructive commands.

## Out of scope (log here during the run, do not act on)

- Redesigning the full Chat Panel UI.
- Reworking the entire harness architecture.
