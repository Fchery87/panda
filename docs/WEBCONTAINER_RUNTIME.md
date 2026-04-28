# WebContainer Runtime

> Last updated: April 28, 2026
>
> Audience: Panda engineers configuring or debugging browser-side command
> execution.

## Purpose

Panda can run project commands in a browser WebContainer when the browser and
deployment support the isolation requirements. When WebContainer is unavailable,
the workbench keeps using the server-backed execution path instead of blocking
the workspace.

For the canonical browser-first positioning and runtime source-of-truth map, see
[Architecture Contract](./ARCHITECTURE_CONTRACT.md). For runtime redaction and
telemetry rules, see
[Security And Trust Boundaries](./SECURITY_TRUST_BOUNDARIES.md).

## Configuration

WebContainer support is controlled by frontend environment variables:

```env
# Enabled by default. Set exactly to false to disable browser-side execution.
NEXT_PUBLIC_WEBCONTAINER_ENABLED=true

# Optional StackBlitz API key, only needed for deployments that require one.
NEXT_PUBLIC_WEBCONTAINER_API_KEY=
```

`NEXT_PUBLIC_WEBCONTAINER_ENABLED` is opt-out. Any value other than the exact
string `false` allows the provider to try booting.

## Browser Requirements

The browser runtime requires `SharedArrayBuffer` and a cross-origin isolated
window. Panda exposes project routes with the extra headers and content security
policy permissions required by WebContainer:

- `Cross-Origin-Embedder-Policy: credentialless`
- `Cross-Origin-Opener-Policy: same-origin`
- script, worker, and frame allowances for StackBlitz-hosted WebContainer assets

Non-project routes keep the stricter default security headers and do not include
the WebContainer-specific allowances.

## Browser Support Matrix

| Environment                                                | Expected browser execution status | Fallback behavior                                                             |
| ---------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------- |
| Chromium-based desktop browser with cross-origin isolation | `ready` when boot succeeds        | Prefer WebContainer for terminal jobs and agent command tools.                |
| Browser missing `SharedArrayBuffer`                        | `unsupported`                     | Use server-backed execution path.                                             |
| Route without WebContainer isolation headers               | `unsupported`                     | Do not boot WebContainer; use server-backed execution if commands are needed. |
| Deployment blocks required worker/script/frame permissions | `error` or `unsupported`          | Keep workspace usable through server-backed execution.                        |
| Local development with feature flag set to `false`         | `unsupported`                     | Use server-backed execution path.                                             |
| Boot timeout or StackBlitz API loading failure             | `error`                           | Reset boot promise so a future mount can retry; use server-backed execution.  |

This matrix is product policy, not a vendor compatibility guarantee. If browser
support changes, update this table and the runtime status copy together.

## Runtime Lifecycle

The workbench keeps a singleton WebContainer boot promise so only one instance
is booted at a time. The UI tracks these states:

- `idle` before boot starts
- `booting` while the API package is loaded and the container boots
- `ready` when browser-side execution is available
- `unsupported` when the feature is disabled or isolation support is missing
- `error` when boot fails after the timeout or API error

Boot failures reset the singleton promise so a future mount can retry. In local
development, boot failures log the isolation support state and error message to
help diagnose header or browser issues.

## Execution Behavior

When WebContainer is ready, terminal jobs and agent command tools prefer the
browser runtime. When it is not ready, command execution falls back to the
server-backed path. This keeps projects usable on browsers, previews, or
deployments that do not satisfy the WebContainer requirements.

Project files are mounted into the browser runtime after the container becomes
ready. Subsequent file writes are mirrored into the container so terminal and
agent commands operate on the latest workspace state.

## Mount Boundaries

Only project workspace files should be mounted into WebContainer. Do not mount:

- Provider tokens, API keys, OAuth secrets, or Convex admin keys.
- Host-machine files outside the project workspace.
- Private environment files unless a future explicit runtime-secret policy
  allows scoped injection.
- Full chat transcripts, run events, or checkpoint payloads unless the runtime
  explicitly needs a bounded file representation.

File sync should follow the same hot/cold data rules as Convex queries: metadata
can be hot, full content is loaded only when the runtime or editor needs it.

## Telemetry And Logging Policy

Runtime telemetry should make fallback debuggable without storing secrets.

Safe telemetry:

- Runtime status: `idle`, `booting`, `ready`, `unsupported`, or `error`.
- Browser capability booleans such as cross-origin isolation support.
- Bounded boot timing, timeout category, and sanitized error kind.
- Whether execution used browser runtime or server fallback.

Do not log or persist:

- Project file contents.
- Environment variable values.
- Provider tokens, auth headers, cookies, or signed URLs.
- Full command output unless it is redacted, bounded, and owner-only.
- Raw checkpoint payloads or transcript bodies for routine boot diagnostics.

## Debugging Checklist

Use this checklist when terminal commands do not run in the browser runtime:

1. Confirm `NEXT_PUBLIC_WEBCONTAINER_ENABLED` is not set to `false`.
2. Confirm the current route is a project workspace route.
3. Confirm the page is cross-origin isolated in DevTools.
4. Check the status bar for `booting`, `ready`, `unsupported`, or `error`.
5. In development, check the console warning for the boot failure message.
6. If the browser runtime is unavailable, verify the server-backed command path
   still works.

## Invariants To Preserve

- Do not boot WebContainer on routes that do not need project execution.
- Do not remove the project-route isolation headers without replacing the
  WebContainer boot strategy.
- Keep the env flag opt-out so existing local development continues working.
- Keep command execution functional when WebContainer is unsupported or fails.
- Do not log secrets or project file contents while diagnosing boot failures.
- Keep runtime telemetry redacted and bounded.
- Keep the WebContainer mount boundary limited to project runtime files.
