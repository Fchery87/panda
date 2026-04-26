# WebContainer Runtime

> Last updated: April 26, 2026
>
> Audience: Panda engineers configuring or debugging browser-side command
> execution.

## Purpose

Panda can run project commands in a browser WebContainer when the browser and
deployment support the isolation requirements. When WebContainer is unavailable,
the workbench keeps using the server-backed execution path instead of blocking
the workspace.

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
