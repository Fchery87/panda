# Plan: Admin/User Policy Settings UI and Docs

## Milestone 1: Convex command-family policy persistence

What: Widen admin and user settings with command-family policy fields, return
redacted/effective policy summaries, enforce user preferences as stricter-only,
and keep admin audit coverage. Acceptance criteria: admin settings contain
command-family defaults; effective settings expose admin, user, and merged
command-family policy; user update rejects preferences that loosen admin policy.
Validation:
`bun test convex/admin.policy-coverage.test.ts convex/settings.browser-defaults.test.ts convex/settings.public-admin-defaults.test.ts && bun run typecheck`
Status: [x] complete

## Milestone 2: Settings UI policy summaries and ceilings

What: Add user-visible policy summaries, command-family stricter preference
controls, and MCP transport ceiling display/selection constraints. Acceptance
criteria: user settings distinguish admin ceiling from user preference, MCP
editor only offers admin-allowed transports, and source tests cover the copy and
fields. Validation:
`bun test apps/web/app/admin/system/page.policy-controls.test.ts apps/web/app/(dashboard)/settings/settings-advanced-gates.test.ts apps/web/lib/agent/command-family-policy.test.ts && bun run typecheck`
Status: [x] complete

## Milestone 3: Docs and final gate

What: Update active harness/security docs and implementation plan status after
verification. Acceptance criteria: docs explain policy layers, command-family
settings, MCP transport ceilings, and Unattended Execution without exposing
sensitive data examples. Validation:
`bun run typecheck && bun run lint && bun run format:check && bun test && npx convex dev --once`
Status: [x] complete
