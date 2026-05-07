# Plan: Authenticated Page Cohesion Pass

## Milestone 1: Surface Audit And Shared Layout Strategy

What: Inspect landing page structure plus `/projects`, `/settings`, and `/admin`
implementations. Identify shared page shell, hero/header, action band, and panel
patterns that can be reused without changing behavior.

Acceptance criteria: Files to change are identified and the implementation path
avoids route/data/auth changes.

Validation: Source inspection only.

Status: [x] complete

## Milestone 2: Shared Cohesive Page Primitives

What: Add or update shared authenticated page layout primitives that express the
landing flow: cream grid canvas, editorial header band, hard frame, dark
operational strip, and rectangular content panels.

Acceptance criteria: Primitives are typed, reusable, sharp-cornered, and
token-based.

Validation: `bun run typecheck`

Status: [x] complete

## Milestone 3: Apply To Projects, Settings, And Admin

What: Update target pages to use the shared flow while preserving their existing
actions and content hierarchy.

Acceptance criteria: `/projects`, `/settings`, and `/admin` feel visually
cohesive with landing while retaining current functionality.

Validation: focused tests or `bun run typecheck && bun run lint`

Status: [x] complete

## Milestone 4: Verification

What: Run focused validation and repair failures introduced by this pass.

Acceptance criteria: Changed files format cleanly; typecheck/lint pass or
blockers are recorded exactly.

Validation:
`bun run typecheck && bun run lint && bunx prettier --check <changed files>`

Status: [x] complete
