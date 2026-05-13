# Status: Admin/User Policy Settings UI and Docs

## Current milestone: Complete

## Last completed: Final validation — 2026-05-12

## Decision log

- This slice implements Milestone 8 from
  `docs/plans/layered-harness-policy-implementation.md`.
- Convex changes use widen-first optional fields for admin and user policy
  preferences.
- User command-family preferences are allowed only when they are equal to or
  stricter than the admin ceiling (`allow < ask < deny`).
- Settings and audit surfaces identify policy keys and summaries only; they do
  not include raw commands, tool arguments, MCP headers, or secrets.
- Project MCP remains recommendation-only.
- Admin default command-family policy starts with `allow` for package-manager
  and git commands, and `ask` for network, destructive, remote-exec,
  filesystem-write, and unknown commands.

## Known issues

- Command-family settings are a settings/governance surface in this slice;
  additional production runtime wiring is explicitly out of scope unless already
  supported by the resolved Harness Policy path.

## Validation evidence

- Focused settings/policy tests passed:
  `bun test convex/admin.policy-coverage.test.ts convex/settings.browser-defaults.test.ts convex/settings.public-admin-defaults.test.ts apps/web/lib/agent/command-family-policy.test.ts apps/web/lib/settings-navigation.test.ts apps/web/app/admin/system/page.policy-controls.test.ts apps/web/app/(dashboard)/settings/settings-advanced-gates.test.ts`
  with 14 passing tests.
- MCP policy UX regression test passed:
  `bun test apps/web/components/settings/MCPServerEditor.policy-ux.test.ts`.
- Typecheck passed: `bun run typecheck`.
- Lint passed: `bun run lint`.
- Final full gate passed:
  `bun run typecheck && bun run lint && bun run format:check && bun test && npx convex dev --once`.
- Full unit suite passed: `bun test` with 1191 passing tests.
- Convex deploy check passed: `npx convex dev --once` with
  `Convex functions ready!`.

## Future work (out of scope, log here)

- Production runtime wiring from persisted command-family settings into all run
  policy snapshots.
- Project/team governance for activating project-scoped MCP.
- Secret storage or encrypted MCP env management.
- Full MCP marketplace/discovery UX.
