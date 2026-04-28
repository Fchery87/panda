# Security And Trust Boundaries

> Last updated: April 28, 2026
>
> Reader: Panda maintainers and future agents changing auth, sharing, provider
> settings, MCP, attachments, runtime execution, telemetry, or admin controls.
>
> Post-read action: decide whether a change is allowed, where authorization is
> enforced, and what must be redacted before data reaches storage, logs, UI, or
> sharing.

## Core Rule

Every sensitive operation must be authorized at the backend boundary.
Route-level UI checks are useful but not sufficient.

Panda stores product truth in Convex. Any query, mutation, action, or API route
that touches user-owned data must derive identity server-side and check
ownership, role, or public-share permission before returning data or performing
work.

## Enforcement Matrix

| Surface                                   | Access rule                                                          | Notes                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Projects and files                        | Project owner only                                                   | File content is owner data and should not load by default in project boot.         |
| Chats and messages                        | Project owner only unless accessed through a public share projection | Owner transcript may contain private context and tool detail.                      |
| Planning sessions and specs               | Project owner only                                                   | Approved plans and specs can guide writes, so they are sensitive execution inputs. |
| Agent runs, events, receipts, checkpoints | Project owner only                                                   | Summaries may be shown by default; full payloads are lazy inspection data.         |
| Attachments                               | Project or message owner only                                        | Signed URLs must be resolved lazily and only for authorized callers.               |
| Provider settings                         | Current user, or admin where explicitly global                       | Raw API keys and OAuth tokens never belong in public responses.                    |
| Provider tokens                           | Current user only                                                    | Return connection metadata, never raw token values.                                |
| MCP servers                               | Current user and admin policy                                        | User-controlled commands and URLs are high-risk configuration.                     |
| Admin settings and audit logs             | Admin only                                                           | Admin mutations must write audit records.                                          |
| Eval suites and results                   | Project owner or admin-owned project scope                           | Eval outputs may contain prompts, responses, and sensitive context.                |
| Shared chats                              | Public only through share ID and redacted projection                 | Shared views must not expose owner-only metadata or inspection payloads.           |
| Runtime actions and terminal jobs         | Project owner plus permission policy                                 | Commands are executable risk and require tool/command policy.                      |

## Identity Rules

- Derive the current user from backend auth context.
- Do not accept user identifiers from client arguments for authorization
  decisions.
- Reuse owner-check helpers rather than duplicating ad hoc checks.
- Admin access requires both authentication and explicit admin status.
- Development or E2E bypasses must be disabled in production.

## Redaction Rules

Redact before data reaches Convex, logs, client-visible UI, telemetry, or
sharing.

Always redact:

- API keys, OAuth tokens, refresh tokens, session tokens, admin keys, and bearer
  tokens.
- Environment variable values that look secret-bearing.
- Authorization headers, cookies, signed URLs, and credentials in command
  output.
- Provider request/response payloads that contain user prompts, private files,
  or raw reasoning unless the target surface explicitly requires them.
- Tool arguments that include file contents, token values, auth headers, or
  private URLs.

Reasoning content is sensitive by default. Show it only behind explicit user
settings or trusted inspection surfaces, and never include it in public share
projections unless a future policy explicitly allows it.

## Sharing Contract

Shared chat pages are public read-only projections. They are not the owner
workspace.

Allowed in public share output:

- Chat title, mode, creation time, and shared time.
- Message role, message content, and creation time after redaction.
- Attachment metadata only if a future public attachment policy explicitly
  allows it.

Not allowed in public share output:

- Raw run events, tool arguments, command output, checkpoints, receipts,
  provider settings, provider tokens, admin data, private file contents,
  attachment signed URLs, private memory, or project policy state.

Shared pages should use paginated transcript loading. Legacy all-message share
queries should be treated as compatibility paths and should not be used by
active public UI.

## Provider And Token Policy

Provider configuration has two categories:

- Safe metadata: enabled state, provider name, selected model, display metadata,
  and capability flags.
- Sensitive values: API keys, OAuth access tokens, refresh tokens, custom auth
  headers, and private base URLs.

Sensitive values must be stored only in owner-scoped or admin-scoped records.
Client responses should return booleans such as `connected`, `hasAccessToken`,
or expiration metadata instead of raw token values.

Live provider catalog data can hydrate selectors, but catalog discovery must not
auto-enable a provider or credentials.

## MCP Policy

MCP servers are user-controlled execution configuration.

- Admin policy may disable user MCP configuration globally.
- Stdio commands and remote URLs must be owner-scoped.
- Runtime execution must still apply command/tool permission checks.
- MCP tool outputs follow the same redaction and transcript rules as native
  tools.
- MCP configuration should not be exposed through public shares or admin
  analytics unless explicitly redacted.

## Runtime And Telemetry Policy

Runtime and telemetry records must be useful for debugging without becoming
secret stores.

Store by default:

- Status, typed errors, bounded summaries, tool names, duration, token usage,
  model IDs, and high-level routing decisions.

Avoid storing by default:

- Full command output, complete file contents, raw tool arguments, raw provider
  payloads, raw reasoning, raw tokens, and signed URLs.

When full detail is necessary for inspection or recovery, keep it owner-only,
bounded, and lazy-loaded.

## Admin Audit Rules

Admin mutations that affect global settings, user access, provider defaults,
registration, analytics, security controls, or maintenance state must persist an
audit entry with:

- Acting admin.
- Action name.
- Resource type and resource ID when available.
- Changed keys or bounded before/after summary.
- Timestamp.

Audit entries must not include raw secrets.

## Review Checklist

Before changing a sensitive surface, answer:

- What identity is derived server-side?
- What owner, admin, or public-share rule authorizes access?
- Could the result contain secrets, tokens, private files, signed URLs, raw tool
  arguments, command output, reasoning, or private provider data?
- Is the result bounded, paginated, summarized, or lazy-loaded?
- Does a public share path receive a separate redacted projection?
- Does an admin mutation write an audit entry?
