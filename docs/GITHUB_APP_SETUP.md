# GitHub App Setup

Reader: internal engineers configuring Panda's GitHub-backed project workflow
for development, staging, or production.

Post-read action: create a GitHub App, install it on a test repository,
configure Panda's environment, and run the GitHub-backed project smoke path.

## Why Panda Uses A GitHub App

Panda opens GitHub repositories as Convex-backed project working copies. GitHub
is the explicit remote for sync, branch, commit, push, and pull request actions.

Use a GitHub App instead of a broad OAuth token because GitHub Apps provide
repository-scoped installation grants, work with private and organization
repositories, and let users see exactly which permissions Panda requests during
installation.

## Setup Checklist

- Create a GitHub App owned by the Panda development account or organization.
- Give the app the minimum repository permissions listed below.
- Generate and store the private key securely.
- Configure Panda environment variables.
- Install the app on a disposable test repository.
- Run the local smoke path before marking S12 complete.

## Register The App

Create the app from GitHub's developer settings:

1. Open GitHub and go to the account or organization that should own the app.
2. Open **Settings**.
3. Open **Developer settings**.
4. Open **GitHub Apps**.
5. Select **New GitHub App**.

Use these values for Panda:

| GitHub App field   | Value                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| GitHub App name    | A short unique name, for example `Panda Dev` or `Panda Staging`. GitHub app names are globally unique.   |
| Description        | `Open GitHub repositories in Panda and ship changes through branches and pull requests.`                 |
| Homepage URL       | The Panda application URL for the environment.                                                           |
| Callback URL       | The Panda GitHub callback URL for the environment, if OAuth during installation is enabled.              |
| Request user auth  | Leave disabled for installation-token-only setup unless user access tokens are implemented.              |
| Setup URL          | The Panda settings or projects URL where users should land after installing the app.                     |
| Redirect on update | Enable this so repository grant changes return users to Panda.                                           |
| Webhook active     | Enable only when Panda has a webhook endpoint configured. Otherwise disable for initial setup.           |
| Installable by     | Use `Only on this account` for private development. Use `Any account` only when ready for external orgs. |

GitHub documents that if **Request user authorization during installation** is
enabled, GitHub uses the callback URL and the setup URL is unavailable. Panda's
current M001 flow only needs installation-scoped repository access, so keep user
authorization disabled unless a later implementation explicitly adds user access
tokens.

## Repository Permissions

GitHub Apps have no permissions by default. Select the minimum permissions Panda
needs for the project workflow.

| Permission area | Access       | Why Panda needs it                                                                 |
| --------------- | ------------ | ---------------------------------------------------------------------------------- |
| Metadata        | Read-only    | Required by GitHub and used to identify repositories and branches.                 |
| Contents        | Read & write | Read repository files, write commits, and authenticate HTTP-based Git operations.  |
| Pull requests   | Read & write | Create pull requests from Panda task branches and read PR status.                  |
| Issues          | Read-only    | Optional for v1; use only for read-only linked issue context from branches or PRs. |

Do not request organization administration, repository administration, secrets,
actions workflow, or members permissions for M001. GitHub recommends selecting
the minimum permissions required, and broader permissions require users or
organization owners to approve the expanded scope.

If Panda later edits workflow files under `.github/workflows`, add the GitHub
**Workflows** repository permission at that time. Do not add it for the current
branch-to-PR workflow.

## Webhooks

For the initial M001 smoke path, Panda can operate without webhooks because sync
is explicit and user-triggered. If webhooks are enabled, configure them
narrowly.

Recommended events when Panda has a webhook endpoint:

| Event                     | Purpose                                                           |
| ------------------------- | ----------------------------------------------------------------- |
| Installation              | Track install, uninstall, suspend, and permission-update changes. |
| Installation repositories | Track repository grants added to or removed from an installation. |
| Pull request              | Refresh Panda PR status after a PR is opened, closed, or merged.  |
| Push                      | Mark remote branches as changed so Panda can show sync warnings.  |

Set a high-entropy webhook secret if webhooks are active. GitHub recommends
validating webhook signatures. For local testing, GitHub documents Smee, ngrok,
localtunnel, and Hookdeck as options for forwarding webhook deliveries, but Smee
should not be used in production because public Smee channels are not
authenticated or secure.

## Generate A Private Key

After the app is created:

1. Open the app settings page.
2. Find **Private keys**.
3. Select **Generate a private key**.
4. Download the PEM file.
5. Store it in the environment secret store for the Panda deployment.

GitHub only stores the public portion of the key, so keep the PEM file secure.
GitHub private keys do not expire automatically and must be rotated manually.
GitHub supports multiple private keys per app, which allows rotation without
downtime.

Do not commit the PEM file. Do not paste it into client-side code. Do not expose
it in logs, shared chats, run receipts, or telemetry.

## Configure Panda Environment

Panda currently reads the GitHub App slug to build the installation URL. The
remaining variables are required for the live GitHub implementation and S12
smoke test, even if a local slice can run with fixtures.

Use environment variables like these for the server-side runtime:

```env
# Public app installation URL support
GITHUB_APP_SLUG=panda-dev

# Server-side GitHub App authentication
GITHUB_APP_ID=123456
GITHUB_APP_CLIENT_ID=Iv1.example
GITHUB_APP_CLIENT_SECRET=...
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=...

# Local S12 fixture fallback only. Do not use as production source of truth.
GITHUB_REPOSITORY_FIXTURES='[{"repositoryId":"123","owner":"octo-org","name":"panda-smoke","fullName":"octo-org/panda-smoke","private":true,"defaultBranch":"main","htmlUrl":"https://github.com/octo-org/panda-smoke"}]'
```

Store secrets in the deployment's secret manager. For Convex deployments, set
server-side secrets in the Convex environment rather than in browser-exposed
variables. Never prefix GitHub secrets with `NEXT_PUBLIC_`.

If the private key is stored as a single-line environment variable, preserve
newlines either by storing the literal multiline PEM value or by replacing
escaped `\n` sequences before signing JSON Web Tokens.

## Install On A Test Repository

Use a disposable repository for S12. The repo should be safe for Panda to write
branches and pull requests into.

1. Open the GitHub App installation URL.
2. Select the account or organization that owns the test repository.
3. Choose **Only select repositories** for development and staging.
4. Select the test repository.
5. Install the app.
6. Return to Panda through the setup URL or open Panda manually.

Prefer a private organization repository for the final smoke test so the app
proves private and organization repository grants work. Use a small repository
with a `main` branch and at least one text file.

## Run The Panda Smoke Path

Run this path after environment variables are configured and the app is
installed on the test repository:

1. Start Panda and Convex for the target environment.
2. Sign in as a Panda user.
3. Open settings and confirm the GitHub connection card shows a connected GitHub
   account or organization.
4. Open the projects page.
5. Create a new project and select the authorized GitHub test repository.
6. Open the project page.
7. Confirm the source-control panel shows repository name, base branch, sync
   state, and pending changes.
8. Create a Panda branch.
9. Edit a file in Panda.
10. Commit the working-copy changes with a clear commit message.
11. Review the push confirmation and confirm the push.
12. Draft a pull request.
13. Review the title and body.
14. Confirm pull request creation.
15. Open GitHub and verify the branch, commit, and pull request exist.
16. Return to Panda and run **Sync from GitHub**.
17. Verify Panda shows a clean sync state when there are no conflicting local
    changes.

S12 is complete only after the smoke path runs against a real GitHub App
installation and test repository. Mocked tests and fixture repository lists are
not sufficient for S12.

## Troubleshooting

| Symptom                                        | Likely cause                                                          | Fix                                                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| GitHub install URL opens the generic apps page | `GITHUB_APP_SLUG` is missing.                                         | Set `GITHUB_APP_SLUG` to the app slug from the GitHub App settings page.             |
| Authorized repository list is empty            | The app is not installed, no repo is granted, or only fixtures exist. | Install the app on the test repository and confirm repository grant selection.       |
| Private repo is missing                        | The installation was limited to another repo or account.              | Update the installation and grant the private test repository.                       |
| GitHub API returns `403`                       | App permissions are too narrow or new permissions were not approved.  | Check repository permissions and have the account owner approve permission changes.  |
| Push or PR creation is blocked in Panda        | External writes require explicit user confirmation.                   | Use the confirmation step in the source-control panel.                               |
| Sync reports conflict                          | Remote changed while Panda has local working-copy changes.            | Commit or discard Panda changes before syncing, or implement an explicit merge path. |
| Webhook deliveries fail                        | Webhook URL, SSL, or secret validation mismatch.                      | Verify webhook URL, SSL verification, and signature secret handling.                 |

## Security Rules

- Keep GitHub App private keys, client secrets, webhook secrets, installation
  tokens, and user tokens server-side.
- Do not expose GitHub secrets through client responses, run receipts, shared
  chats, source-control panels, or browser logs.
- Request only the permissions listed for the current workflow.
- Rotate private keys manually and keep at least one valid key during rotation.
- Use a webhook secret whenever webhooks are enabled.
- Require explicit user confirmation before writes that mutate GitHub.

## Source References

This guide was checked against current GitHub documentation for registering a
GitHub App, choosing permissions, managing private keys, and using webhooks.

- GitHub Docs: Registering a GitHub App
- GitHub Docs: Choosing permissions for a GitHub App
- GitHub Docs: Managing private keys for GitHub Apps
- GitHub Docs: Using webhooks with GitHub Apps
