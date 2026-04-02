# Panda Page Architecture Change Summary

Date: 2026-04-02

## Access and App Shell

Access-state handling is now centralized across login, maintenance, middleware, and protected routes. The app shell also has better metadata and accessibility primitives, including a root skip link and consistent main-content targeting. This removed duplicate auth-state copy and made maintenance and registration-closed flows render from a shared source of truth.

## Public and Shared Pages

The landing and education pages now pull from shared capability data instead of drifting hardcoded content. The shared transcript page was upgraded into a real read-only review surface with consistent message rendering and stable timestamps. That closes the biggest mismatch between marketing/docs pages and the actual product surface.

## Projects, Workbench, and Settings

The projects index is safer and more accessible: labeled search, real delete confirmation, and more reliable last-opened tracking. The workbench now wires breadcrumb reveal into the explorer properly and surfaces inline-chat failures to users instead of only logging them. Settings now sync tab state to the URL, warn on unsaved changes, and route back to `/projects` correctly.

## Admin IA and Admin Workflows

The admin area is now split cleanly between overview and dedicated operational pages. The admin hub became a navigation surface instead of embedding duplicate tools, while users, analytics, security, and system pages gained URL-persisted state, safer interactions, and shared provider configuration. Admin user deep links are now resolved safely, and audit-log filtering is exhaustive and sorted newest-first.

## Verification and Quality Closure

The stale API-route auth test breakage was resolved through the local Next.js auth wrapper, which brought the route test cluster back to green. Formatting drift and the warning backlog were cleared, and the repo now verifies cleanly on lint, format check, tests, typecheck, and build. The one environment note is that build success depends on allowing `convex codegen` network access during prebuild.
