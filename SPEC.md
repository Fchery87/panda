# Spec: Mode Selector System Scan

## Deliverables

- [x] Validate Panda's mode selector wiring across UI state, chat session state,
      routing decisions, prompt construction, runtime agent selection, and
      permission policy.
- [x] Run the available quality gates needed to catch regressions in mode
      behavior and recent chat/file materialization fixes.
- [x] Inspect focused tests for `ask`, `plan`, `code`, and `build` mode
      contracts and add/repair coverage if a gap is found.
- [x] Update `VALIDATION_TASKS.md` with scan results, health score, and any
      remaining tasks.

## Constraints

- Preserve existing uncommitted and staged work.
- Do not alter the canonical modes: `ask`, `plan`, `code`, `build`.
- Do not loosen permission policy or YOLO/session approval boundaries.
- Avoid running long-lived dev servers.
- Do not run destructive commands.

## Out of scope (log here during the run, do not act on)

- Redesigning the mode selector UI.
- Reworking the full agent harness architecture.
