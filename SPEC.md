# Spec: Execution Session Finalization

## Deliverables

- [ ] Add timeline row derivation for compressed session narratives.
- [ ] Replace the renamed home/session canvas with a real timeline renderer.
- [ ] Make the composer persistent and dominant in the session experience.
- [ ] Demote editor/files/terminal/diff/search/git into contextual support
      surfaces.
- [ ] Review changed files as session-attached work.
- [ ] Make session resume state immediately visible.
- [ ] Render parallel branches as session outcomes, not a swarm dashboard.
- [ ] Run browser smoke verification on desktop and mobile.

## Constraints

- Keep Execution Session derived unless resume work proves persistence is
  needed.
- Preserve `ask`, `plan`, `code`, and `build` modes.
- Preserve browser-first with server fallback.
- Preserve existing harness internals and Convex ownership.
- Keep hot UI payloads summary-first and bounded.
- Keep editor/file/terminal power available on demand.
- Each slice must pass fresh verification before the next slice starts.

## Out Of Scope

- Adding an `executionSessions` table before S06 proves a need.
- Replacing the harness.
- Creating an orchestration/swarm dashboard.
- Copying OpenCode Desktop runtime architecture.
