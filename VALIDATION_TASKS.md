# Validation Tasks & Health Record - Panda

**Last Updated:** 2026-04-14  
**Scope:** Current repo health snapshot after docs refresh

---

## Current Verification Status

| Command                | Status    | Notes                                                                                                                                              |
| ---------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run typecheck`    | PASS      | Turbo typecheck is green for `@panda-ai/sdk` and `@panda-ai/web`.                                                                                  |
| `bun run lint`         | PASS      | ESLint exits 0, but there are 3 existing React hook warnings in `ChatInput.tsx` and `useAgent.ts`.                                                 |
| `bun run format:check` | PASS      | The touched docs and `SpecBadge.tsx` are formatted. `.opencode/` is ignored from Prettier now.                                                     |
| `bun test`             | FAIL      | One existing failure remains in `Harness adapter guardrail parity > auto-approves allowlisted run_command calls from harness session permissions`. |
| `bun run build`        | FAIL      | Convex codegen failed with `TypeError: fetch failed` during the web prebuild step.                                                                 |
| `bun run test:e2e`     | Not rerun | Not part of this docs refresh pass.                                                                                                                |

---

## Open Issues

1. Resolve the remaining harness adapter parity test failure.
2. Clear the existing React hook warnings in
   `apps/web/components/chat/ChatInput.tsx` and `apps/web/hooks/useAgent.ts`.
3. Fix or isolate the Convex codegen fetch failure, then re-run the full repo
   validation gate.
4. Re-run the full repo validation gate once those issues are addressed.

---

## Current Active Docs

- [README.md](./README.md)
- [AGENTS.md](./AGENTS.md)
- [docs/README.md](./docs/README.md)
- [docs/AGENTIC_HARNESS.md](./docs/AGENTIC_HARNESS.md)
- [docs/CHAT_TRANSCRIPT_POLICY.md](./docs/CHAT_TRANSCRIPT_POLICY.md)
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- [docs/GOOGLE_OAUTH_SETUP.md](./docs/GOOGLE_OAUTH_SETUP.md)
- [convex/README.md](./convex/README.md)

---

## Notes

- Historical plans and review snapshots remain in `docs/plans/` and the root
  review/log markdown files, but they are explicitly labeled as archive
  material.
- The docs refresh did not change runtime code behavior.
- The production build currently depends on network-accessible Convex codegen
  during `apps/web` prebuild.
