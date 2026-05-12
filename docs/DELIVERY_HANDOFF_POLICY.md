# Delivery Handoff Policy

> Last updated: May 12, 2026
>
> Reader: Panda maintainers deciding whether to add in-product deployment,
> export, or release handoff behavior.
>
> Post-read action: choose the narrow handoff path that preserves Panda's
> current source-control, runtime, and trust-boundary contracts.

## Decision

Panda keeps hosted deployment external for now. The in-product delivery path is
a GitHub-backed handoff: create a task branch, review changes, commit, confirm
push, draft a pull request, and let the user's existing GitHub, CI, Vercel, or
other deployment system perform the final deploy.

Panda may add narrow export affordances only when they package reviewable work
without bypassing the branch and pull request flow. Export must not become a
parallel deployment system.

## Why This Is The Current Boundary

Panda already owns implementation, proof, changed-work review, and GitHub-backed
source-control state. Deployment hosts own production environment selection,
secrets, domains, previews, rollbacks, billing, and incident responsibility.

Keeping deployment external protects three existing contracts:

- GitHub writes remain explicit user-confirmed actions.
- Browser runtime execution stays browser-first with server fallback, not a
  production hosting layer.
- Provider tokens, OAuth secrets, deploy keys, runtime secrets, and environment
  values stay outside public or shareable Panda surfaces.

## In-Product Scope

Panda can improve the handoff path by making these states clearer inside the
workbench:

- Branch exists or needs creation.
- Working copy is clean, dirty, remote-changed, or conflicted.
- Changed files need review before commit.
- Commit exists and is waiting for push.
- Branch has been pushed and is ready for a pull request draft.
- Pull request is drafted, created, or ready to open externally.
- Validation and receipt evidence are available for the pull request body.

These affordances should reuse the existing Execution Session Shell and
source-control panel. Do not add a separate deployment wizard unless a later
decision creates a real deployment product.

## Out Of Scope For Now

Panda should not currently own:

- Creating production deployments directly from the workbench.
- Managing hosting providers, teams, domains, or DNS records.
- Storing deploy keys or runtime production secrets for third-party hosts.
- Triggering rollbacks, promotions, or production traffic switches.
- Creating a second package/export flow that bypasses GitHub review.
- Treating WebContainer output as a production artifact.

## Acceptable Future Export Shape

If export is added before full deployment support, it should be a review handoff
only. Acceptable examples:

- Download a bounded patch or changed-file bundle for owner-only review.
- Generate a pull request summary from the execution receipt.
- Attach validation evidence to a GitHub pull request draft.
- Produce a local handoff note that points back to branch, commit, and receipt
  state.

Every export action must state whether it contains source code, proof metadata,
or both. Public share views must continue using redacted projections.

## Requirements For Reopening Deployment Scope

Before Panda adds direct deployment, a new decision must define:

- Which host or deployment abstraction Panda owns.
- Where deploy credentials and runtime secrets live.
- How user confirmation, audit logs, and rollback ownership work.
- How preview, staging, and production environments are separated.
- Which validation gate is required before deploy.
- How deployment state appears in owner-only proof and public share surfaces.

Until those requirements exist, Panda's product promise is implementation and
review handoff, not hosted deployment.
