# Security & Performance Audit Report: Panda.ai

**Date:** 2026-02-22  
**Auditor:** AI Security Analysis  
**Severity Scale:** Critical → High → Medium → Low  
**OWASP Top 10 Mapping Included**

---

## Executive Summary

| Risk Level   | Count |
| ------------ | ----- |
| **CRITICAL** | 2     |
| **HIGH**     | 4     |
| **MEDIUM**   | 5     |
| **LOW**      | 4     |

**Overall Security Posture: HIGH RISK** ⚠️

The codebase contains **critical RCE vulnerabilities** and **broken access
control** issues that require immediate remediation. The command execution API
has no authentication, allowing any attacker to execute arbitrary commands on
the server.

---

## CRITICAL Findings

### 1. Remote Code Execution via Unauthenticated Command Execution API

**OWASP:** A01:2021 - Broken Access Control, A03:2021 - Injection  
**Location:** `apps/web/app/api/jobs/execute/route.ts:38-127`

```typescript
// VULNERABLE CODE - No authentication check!
export async function POST(req: NextRequest) {
  const command = body.command?.trim()  // User-controlled input
  // ...
  const child = spawn(command, {
    shell: true,  // ⚠️ Shell injection enabled
    env: process.env,  // ⚠️ Exposes ALL environment secrets
  })
```

**Impact:** Complete server compromise. Attackers can:

- Read all environment secrets (API keys, database credentials)
- Execute arbitrary shell commands
- Pivot to other services

**Remediation:**

```typescript
import { getAuth } from '@convex-dev/auth/nextjs/server'

export async function POST(req: NextRequest) {
  // Add authentication
  const auth = await getAuth(req)
  if (!auth.isAuthenticated) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Whitelist allowed commands
  const ALLOWED_COMMANDS = ['npm', 'bun', 'git', 'ls', 'cat']
  const cmdBase = command.split(' ')[0]
  if (!ALLOWED_COMMANDS.includes(cmdBase)) {
    return Response.json({ error: 'Command not allowed' }, { status: 403 })
  }

  // Use sanitized environment
  const safeEnv = { PATH: process.env.PATH }
  // ...
}
```

---

### 2. Multiple IDOR (Insecure Direct Object Reference) Vulnerabilities

**OWASP:** A01:2021 - Broken Access Control  
**Locations:** `convex/messages.ts`, `convex/artifacts.ts`

**messages.ts:6-15** - No ownership verification:

```typescript
export const list = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args) => {
    // ❌ NO AUTH CHECK - Anyone can read any chat's messages
    return await ctx.db
      .query('messages')
      .withIndex('by_created', (q) => q.eq('chatId', args.chatId))
      .collect()
  },
})
```

**Affected Functions:**

- `messages.ts:6-15` - `list` query (no auth check)
- `messages.ts:26-56` - `add` mutation (no ownership check)
- `messages.ts:60-82` - `update` mutation (no ownership check)
- `artifacts.ts:6-14` - `list` query (no auth check)
- `artifacts.ts:17-22` - `get` query (no auth check)
- `artifacts.ts:25-51` - `create` mutation (no ownership check)

**Remediation:**

```typescript
export const list = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    const chat = await ctx.db.get(args.chatId)
    if (!chat) throw new Error('Chat not found')

    // Verify ownership via project
    const project = await ctx.db.get(chat.projectId)
    if (!project || project.createdBy !== userId) {
      throw new Error('Access denied')
    }

    return await ctx.db
      .query('messages')
      .withIndex('by_created', (q) => q.eq('chatId', args.chatId))
      .collect()
  },
})
```

---

## HIGH Findings

### 3. Overly Permissive CORS Configuration

**OWASP:** A01:2021 - Broken Access Control  
**Location:** `convex/http.ts:19-24`

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // ❌ Allows ANY origin
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
```

**Impact:** Any malicious website can call your API endpoints, potentially:

- Abuse your LLM API credits
- Access user data via authenticated requests
- Perform CSRF-like attacks

**Remediation:**

```typescript
const ALLOWED_ORIGINS = [
  'https://panda.ai',
  'https://www.panda.ai',
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean)

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin || '')
    ? origin
    : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}
```

---

### 4. E2E Auth Bypass Mechanism in Production Code

**OWASP:** A07:2021 - Identification and Authentication Failures  
**Location:** `apps/web/middleware.ts:12-14`, `convex/lib/auth.ts:33-35`

```typescript
if (process.env.E2E_AUTH_BYPASS === 'true') {
  return // ⚠️ Bypasses ALL authentication
}
```

**Impact:** If `E2E_AUTH_BYPASS=true` is accidentally set in production:

- Complete authentication bypass
- Full access to all user data
- No audit trail

**Remediation:**

```typescript
// Only allow bypass in non-production environments
function isE2EAuthBypassEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.E2E_AUTH_BYPASS === 'true'
}
```

---

### 5. Weak Share ID Generation (Enumeration Attack)

**OWASP:** A01:2021 - Broken Access Control  
**Location:** `convex/sharing.ts:12-19`

```typescript
function generateShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    // ❌ Only 8 chars = 2.8 trillion combinations
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
```

**Impact:** Attackers can enumerate shared chat links:

- 36^8 ≈ 2.8 trillion possibilities
- At 1000 req/sec = ~89 days to enumerate all
- Using `Math.random()` is not cryptographically secure

**Remediation:**

```typescript
import { randomBytes } from 'crypto'

function generateShareId(): string {
  // Use 16 bytes = 32 hex chars = 2^128 possibilities
  return randomBytes(16).toString('hex')
}
```

---

### 6. Dependency Vulnerabilities (SCA)

**Source:** `bun audit`

| Package              | Vulnerability                | Severity | Advisory            |
| -------------------- | ---------------------------- | -------- | ------------------- |
| `minimatch`          | ReDoS via repeated wildcards | **HIGH** | GHSA-3ppc-4f35-3m26 |
| `jsondiffpatch`      | XSS via HtmlFormatter        | Moderate | GHSA-33vc-wfww-vjfv |
| `ajv`                | ReDoS with $data option      | Moderate | GHSA-2g4f-4pwh-qvx6 |
| `ai` (Vercel AI SDK) | Filetype bypass              | Low      | GHSA-rwvc-j5jr-mgvh |

**Remediation:**

```bash
bun update minimatch@^10.2.1 jsondiffpatch@^0.7.2 ajv@^6.14.0 ai@^5.0.52
```

---

## MEDIUM Findings

### 7. Missing Security Headers

**OWASP:** A05:2021 - Security Misconfiguration  
**Location:** `apps/web/next.config.ts`, `convex/http.ts`

**Missing Headers:**

- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Strict-Transport-Security`
- `Referrer-Policy`
- `Permissions-Policy`

**Remediation:** Add to `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'",
          },
        ],
      },
    ]
  },
}
```

---

### 8. No Authentication on LLM Streaming Endpoints

**OWASP:** A01:2021 - Broken Access Control  
**Location:** `convex/http.ts:176-384`

The `/api/llm/streamChat` and `/api/llm/listModels` endpoints have no
authentication, allowing:

- Abuse of your LLM API credits
- Resource exhaustion attacks

**Remediation:** Add authentication to all LLM endpoints.

---

### 9. API Key in URL Query Parameter

**OWASP:** A02:2021 - Cryptographic Failures  
**Location:** `convex/http.ts:412`

```typescript
const apiKey = url.searchParams.get('apiKey') // ❌ Logged in server logs
```

**Impact:** API keys may be logged in server access logs, proxy logs, etc.

**Remediation:** Use `Authorization` header instead:

```typescript
const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '')
```

---

### 10. Environment Secrets Passed to Child Processes

**OWASP:** A02:2021 - Cryptographic Failures  
**Location:** `apps/web/app/api/jobs/execute/route.ts:68`

```typescript
env: process.env,  // ❌ ALL secrets exposed to child process
```

**Remediation:** Whitelist only necessary environment variables:

```typescript
const safeEnv = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
}
```

---

### 11. Inconsistent Authentication Patterns

**Location:** Multiple files

Three different auth patterns are used:

- `requireAuth(ctx)`
- `getCurrentUserId(ctx)`
- `ctx.auth.getUserIdentity()`

This inconsistency leads to authorization bypasses.

**Remediation:** Standardize on a single pattern. Create a wrapper that:

1. Always validates ownership
2. Throws on failure
3. Returns typed user ID

---

## LOW Findings

### 12. No CI/CD Security Scanning

**Location:** `.github/workflows/ci.yml`

The CI pipeline lacks:

- Dependency vulnerability scanning
- SAST (Static Application Security Testing)
- Secret scanning

**Remediation:** Add security job:

```yaml
security:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: '1.2.0'
    - run: bun install
    - run: bun audit --audit-level=moderate
    - uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

### 13. Missing Input Validation on Provider Names

**Location:** `convex/http.ts:75-123`

Provider names are not validated against a whitelist.

**Remediation:**

```typescript
const ALLOWED_PROVIDERS = [
  'openai',
  'openrouter',
  'together',
  'zai',
  'anthropic',
  'groq',
  'deepseek',
  'fireworks',
]
if (!ALLOWED_PROVIDERS.includes(provider)) {
  throw new Error(`Invalid provider: ${provider}`)
}
```

---

### 14. No Rate Limiting

**Location:** All API endpoints

No rate limiting is implemented, allowing:

- Brute force attacks
- Resource exhaustion

**Remediation:** Implement rate limiting using:

- Upstash Redis + `@upstash/ratelimit`
- Cloudflare Rate Limiting
- Vercel Edge Middleware

---

### 15. Error Messages May Leak Internal Details

**Location:** Multiple files

```typescript
throw new Error('Project not found or access denied') // Ambiguous - good
throw new Error(`LLM API error (${response.status}): ${errorText}`) // Leaks details - bad
```

**Remediation:** Sanitize error messages before returning to clients:

```typescript
// Log detailed error internally
console.error('LLM API error:', response.status, errorText)
// Return generic message to client
throw new Error('Failed to process request. Please try again.')
```

---

## Performance Issues

### 16. N+1 Query Pattern in Project Deletion

**Location:** `convex/projects.ts:117-165`

```typescript
for (const file of files) {
  const snapshots = await ctx.db.query('fileSnapshots')...  // N+1
}
for (const chat of chats) {
  const messages = await ctx.db.query('messages')...  // N+1
  for (const message of messages) {
    const artifacts = await ctx.db.query('artifacts')...  // N+1
  }
}
```

**Impact:** O(n³) complexity for project deletion. Large projects may timeout.

**Remediation:** Batch queries or use background jobs for cleanup.

---

### 17. Potential Memory Leak in Streaming Handlers

**Location:** `convex/http.ts:278-365`

The streaming response doesn't handle client disconnects gracefully.

**Remediation:** Add abort signal handling:

```typescript
const stream = new ReadableStream({
  async start(controller) {
    const reader = response.body?.getReader()

    // Handle abort signal
    const abortHandler = () => {
      reader?.cancel()
      controller.close()
    }
    signal?.addEventListener('abort', abortHandler)

    try {
      // ... streaming logic
    } finally {
      signal?.removeEventListener('abort', abortHandler)
      reader?.releaseLock()
    }
  },
})
```

---

## Dead Code & Unused Dependencies

Analysis found minimal dead code. The codebase is generally well-maintained with
proper cleanup in useEffect hooks.

**Positive Observations:**

- Event listeners properly cleaned up in `useInlineChat.ts:67`
- Intervals cleared in `RunProgressPanel.tsx:64`
- AbortController usage in `useAgent.ts:580`

---

## Quick Wins (Immediate Actions)

Priority order for remediation:

1. **CRITICAL:** Add authentication to `/api/jobs/execute`
2. **CRITICAL:** Add ownership checks to all Convex queries/mutations
3. **HIGH:** Fix CORS to use allowlist instead of `*`
4. **HIGH:** Update vulnerable dependencies: `minimatch`, `jsondiffpatch`,
   `ajv`, `ai`
5. **MEDIUM:** Add security headers in `next.config.ts`
6. **MEDIUM:** Add authentication to LLM streaming endpoints
7. **LOW:** Add CI/CD security scanning

---

## Recommended Security Tooling

Add to `package.json`:

```json
{
  "scripts": {
    "security:audit": "bun audit --audit-level=moderate",
    "security:scan": "semgrep --config p/owasp-top-ten .",
    "security:secrets": "gitleaks detect --source ."
  }
}
```

Create `.github/workflows/security.yml`:

```yaml
name: Security

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
  schedule:
    - cron: '0 0 * * 1' # Weekly

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: '1.2.0'

      - name: Install dependencies
        run: bun install

      - name: Run dependency audit
        run: bun audit --audit-level=moderate

      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: p/owasp-top-ten

      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Convex Security Best Practices](https://docs.convex.dev/production/security)

---

**Report Generated:** 2026-02-22  
**Auditor:** AI Security Analysis  
**Status:** Requires Immediate Action
