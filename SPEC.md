# Spec: Execution Session Upgrade Completion

## Deliverables

- [ ] Make the right panel behave as a session inspector for proof, changed
      work, context, and preview.
- [ ] Rebuild the session rail presentation around active/review/recent/idle
      session states while keeping chat-backed storage.
- [ ] Make the session timeline and next-action canvas the primary center
      workspace surface.
- [ ] Present parallel agent work as session-scoped branch outcomes.
- [ ] Decide whether Execution Session remains derived or needs persistence,
      then update architecture docs accordingly.
- [ ] Run the full quality gate and clean up temporary task artifacts when the
      implementation is accepted.

## Constraints

- Preserve canonical modes: `ask`, `plan`, `code`, and `build`.
- Preserve browser-first with server fallback.
- Preserve existing Convex ownership for chats, planning sessions, runs,
  receipts, artifacts, messages, and files unless a later milestone explicitly
  proves persistence is needed.
- Do not add an `executionSessions` table before the persistence decision.
- Do not expose multi-orchestration as a swarm dashboard.
- Keep hot Convex queries bounded and summary-first.
- Keep editor, file tree, terminal, diff, and preview reachable throughout the
  upgrade.
- Each milestone must be verified before advancing to the next.

## Out Of Scope

- Copying OpenCode Desktop's Tauri or sidecar runtime architecture.
- Removing the existing agent harness.
- Removing the canonical modes.
- Large visual redesign unrelated to the session-first hierarchy.
- Committing changes unless explicitly requested.
