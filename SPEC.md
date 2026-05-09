# Spec: M001 GitHub-Backed Panda Projects Implementation

## Deliverables

- [ ] Implement all approved slices in `.gsd/milestones/M001/M001-ROADMAP.md` in
      dependency order.
- [ ] Preserve the milestone decisions in `.gsd/milestones/M001/M001-CONTEXT.md`
      and `.gsd/DECISIONS.md`.
- [ ] Verify each completed slice before advancing to the next slice.
- [ ] Keep raw GitHub tokens and installation credentials out of client-visible
      responses, logs, public shares, and telemetry.

## Constraints

- Must keep Convex as Panda's editable project working-copy source of truth.
- Must derive user identity server-side for GitHub connection and project
  ownership decisions.
- Must not use local workspace-root Git APIs as the production GitHub project
  integration boundary.
- Must not silently auto-sync GitHub remote changes.
- Must require explicit confirmation for external GitHub writes.

## Out of scope (log here during the run, do not act on)

- Full GitHub issue management beyond read-only linked context.
- Multi-repository Panda projects.
- Releases, deployments, repository settings, and GitHub organization
  administration.
