# Panda Workbench IDE — Production Readiness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the three P0 gaps (multi-language editor, find & replace, git backend + panel) and two P1 gaps (per-hunk diff accept/reject, symbol-level breadcrumbs) to bring the Panda workbench to production parity with modern IDE standards.

**Architecture:** Each task is self-contained with its own tests and commit. Language support uses dynamic lazy-loading to avoid bloating the bundle. Git backend extends the existing `/api/git/` route with new commands. Find & replace extends `ProjectSearchPanel` with a replace mode. Per-hunk diff and symbol breadcrumbs add to existing components.

**Tech Stack:** CodeMirror 6 language packages, Next.js API routes, `simple-git` (or raw `execFile`), Bun test runner, React, TypeScript.

---

## Phase 1: Multi-Language Syntax Highlighting (P0)

### Task 1: Install CodeMirror language packages

**Files:**
- Modify: `apps/web/package.json:24-29` (add new @codemirror/lang-* deps)

**Step 1: Install language packages**

Run:
```bash
cd apps/web && bun add @codemirror/lang-python @codemirror/lang-html @codemirror/lang-css @codemirror/lang-json @codemirror/lang-markdown @codemirror/lang-rust @codemirror/lang-cpp @codemirror/lang-java @codemirror/lang-sql @codemirror/lang-xml @codemirror/lang-go @codemirror/lang-yaml @codemirror/lang-php
```

**Step 2: Verify installation**

Run: `cd apps/web && bun pm ls | grep @codemirror/lang`
Expected: All 14 language packages listed (javascript + 13 new ones).

**Step 3: Commit**

```bash
git add apps/web/package.json apps/web/bun.lock
git commit -m "deps: install CodeMirror language packages for multi-language highlighting"
```

---

### Task 2: Create language resolver utility

**Files:**
- Create: `apps/web/components/editor/language-support.ts`
- Test: `apps/web/components/editor/language-support.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/web/components/editor/language-support.test.ts
import { describe, it, expect } from 'bun:test'
import { getLanguageExtension, getSupportedExtensions } from './language-support'

describe('getLanguageExtension', () => {
  it('returns javascript for .js files', async () => {
    const ext = await getLanguageExtension('app.js')
    expect(ext).toBeDefined()
  })

  it('returns javascript with jsx for .jsx files', async () => {
    const ext = await getLanguageExtension('Component.jsx')
    expect(ext).toBeDefined()
  })

  it('returns javascript with typescript for .ts files', async () => {
    const ext = await getLanguageExtension('index.ts')
    expect(ext).toBeDefined()
  })

  it('returns javascript with typescript+jsx for .tsx files', async () => {
    const ext = await getLanguageExtension('Page.tsx')
    expect(ext).toBeDefined()
  })

  it('returns python for .py files', async () => {
    const ext = await getLanguageExtension('main.py')
    expect(ext).toBeDefined()
  })

  it('returns html for .html files', async () => {
    const ext = await getLanguageExtension('index.html')
    expect(ext).toBeDefined()
  })

  it('returns css for .css files', async () => {
    const ext = await getLanguageExtension('styles.css')
    expect(ext).toBeDefined()
  })

  it('returns json for .json files', async () => {
    const ext = await getLanguageExtension('package.json')
    expect(ext).toBeDefined()
  })

  it('returns markdown for .md files', async () => {
    const ext = await getLanguageExtension('README.md')
    expect(ext).toBeDefined()
  })

  it('returns rust for .rs files', async () => {
    const ext = await getLanguageExtension('lib.rs')
    expect(ext).toBeDefined()
  })

  it('returns go for .go files', async () => {
    const ext = await getLanguageExtension('main.go')
    expect(ext).toBeDefined()
  })

  it('returns java for .java files', async () => {
    const ext = await getLanguageExtension('App.java')
    expect(ext).toBeDefined()
  })

  it('returns cpp for .cpp files', async () => {
    const ext = await getLanguageExtension('main.cpp')
    expect(ext).toBeDefined()
  })

  it('returns sql for .sql files', async () => {
    const ext = await getLanguageExtension('query.sql')
    expect(ext).toBeDefined()
  })

  it('returns xml for .xml files', async () => {
    const ext = await getLanguageExtension('config.xml')
    expect(ext).toBeDefined()
  })

  it('returns yaml for .yml files', async () => {
    const ext = await getLanguageExtension('docker-compose.yml')
    expect(ext).toBeDefined()
  })

  it('returns yaml for .yaml files', async () => {
    const ext = await getLanguageExtension('config.yaml')
    expect(ext).toBeDefined()
  })

  it('returns php for .php files', async () => {
    const ext = await getLanguageExtension('index.php')
    expect(ext).toBeDefined()
  })

  it('returns empty array for unknown extensions', async () => {
    const ext = await getLanguageExtension('data.xyz')
    expect(ext).toEqual([])
  })

  it('handles files with no extension', async () => {
    const ext = await getLanguageExtension('Makefile')
    expect(ext).toEqual([])
  })
})

describe('getSupportedExtensions', () => {
  it('returns a non-empty set of supported extensions', () => {
    const exts = getSupportedExtensions()
    expect(exts.size).toBeGreaterThan(10)
    expect(exts.has('.ts')).toBe(true)
    expect(exts.has('.py')).toBe(true)
    expect(exts.has('.go')).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test components/editor/language-support.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the implementation**

```typescript
// apps/web/components/editor/language-support.ts
import type { Extension } from '@codemirror/state'

/**
 * Maps file extensions to lazy-loaded CodeMirror language extensions.
 * Each loader returns an Extension (LanguageSupport instance).
 * Using dynamic imports to avoid bundling all languages upfront.
 */
const LANGUAGE_MAP: Record<string, () => Promise<Extension>> = {
  // JavaScript / TypeScript
  '.js': () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: false })),
  '.jsx': () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true })),
  '.mjs': () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: false })),
  '.cjs': () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: false })),
  '.ts': () =>
    import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: false, typescript: true })),
  '.tsx': () =>
    import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true, typescript: true })),
  '.mts': () =>
    import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: false, typescript: true })),
  '.cts': () =>
    import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: false, typescript: true })),

  // Python
  '.py': () => import('@codemirror/lang-python').then((m) => m.python()),
  '.pyw': () => import('@codemirror/lang-python').then((m) => m.python()),
  '.pyi': () => import('@codemirror/lang-python').then((m) => m.python()),

  // Web
  '.html': () => import('@codemirror/lang-html').then((m) => m.html()),
  '.htm': () => import('@codemirror/lang-html').then((m) => m.html()),
  '.svg': () => import('@codemirror/lang-html').then((m) => m.html()),
  '.css': () => import('@codemirror/lang-css').then((m) => m.css()),
  '.scss': () => import('@codemirror/lang-css').then((m) => m.css()),
  '.less': () => import('@codemirror/lang-css').then((m) => m.css()),
  '.php': () => import('@codemirror/lang-php').then((m) => m.php()),

  // Data
  '.json': () => import('@codemirror/lang-json').then((m) => m.json()),
  '.jsonc': () => import('@codemirror/lang-json').then((m) => m.json()),
  '.xml': () => import('@codemirror/lang-xml').then((m) => m.xml()),
  '.yaml': () => import('@codemirror/lang-yaml').then((m) => m.yaml()),
  '.yml': () => import('@codemirror/lang-yaml').then((m) => m.yaml()),
  '.toml': () => import('@codemirror/lang-json').then((m) => m.json()), // close enough

  // Documentation
  '.md': () => import('@codemirror/lang-markdown').then((m) => m.markdown()),
  '.markdown': () => import('@codemirror/lang-markdown').then((m) => m.markdown()),
  '.mdx': () => import('@codemirror/lang-markdown').then((m) => m.markdown()),

  // Systems
  '.rs': () => import('@codemirror/lang-rust').then((m) => m.rust()),
  '.go': () => import('@codemirror/lang-go').then((m) => m.go()),
  '.c': () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  '.h': () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  '.cpp': () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  '.hpp': () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  '.cc': () => import('@codemirror/lang-cpp').then((m) => m.cpp()),

  // JVM
  '.java': () => import('@codemirror/lang-java').then((m) => m.java()),

  // SQL
  '.sql': () => import('@codemirror/lang-sql').then((m) => m.sql()),
}

/**
 * Resolves the appropriate CodeMirror language extension for a given filename.
 * Returns an empty array if the language is not supported (safe to spread into extensions).
 */
export async function getLanguageExtension(filePath: string): Promise<Extension | Extension[]> {
  const dotIdx = filePath.lastIndexOf('.')
  if (dotIdx === -1) return []

  const ext = filePath.slice(dotIdx).toLowerCase()
  const loader = LANGUAGE_MAP[ext]
  if (!loader) return []

  try {
    return await loader()
  } catch {
    console.warn(`[language-support] Failed to load language for ${ext}`)
    return []
  }
}

/**
 * Returns the set of file extensions that have syntax highlighting support.
 */
export function getSupportedExtensions(): Set<string> {
  return new Set(Object.keys(LANGUAGE_MAP))
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test components/editor/language-support.test.ts`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add apps/web/components/editor/language-support.ts apps/web/components/editor/language-support.test.ts
git commit -m "feat(editor): add language resolver with lazy-loaded CodeMirror support for 20+ languages"
```

---

### Task 3: Integrate language resolver into CodeMirrorEditor

**Files:**
- Modify: `apps/web/components/editor/CodeMirrorEditor.tsx:7,86-90,244-252`

**Step 1: Replace static javascript import with dynamic language loading**

In `CodeMirrorEditor.tsx`, make these changes:

1. Remove the static import on line 7:
   ```typescript
   // REMOVE: import { javascript } from '@codemirror/lang-javascript'
   ```

2. Add the new import:
   ```typescript
   import { getLanguageExtension } from './language-support'
   ```

3. Add state and effect for dynamic language loading. Inside the component, add:
   ```typescript
   const [langExtension, setLangExtension] = useState<Extension | Extension[]>([])

   useEffect(() => {
     let cancelled = false
     getLanguageExtension(filePath).then((ext) => {
       if (!cancelled) setLangExtension(ext)
     })
     return () => { cancelled = true }
   }, [filePath])
   ```

4. Remove the `isTypeScript` logic (lines 86-90).

5. Replace the extensions array (lines 244-252). Change:
   ```typescript
   extensions={[
     jumpHighlightField,
     jumpHighlightTheme,
     javascript({
       jsx: true,
       typescript: isTypeScript,
     }),
     ...mergeExtensions,
   ]}
   ```
   To:
   ```typescript
   extensions={[
     jumpHighlightField,
     jumpHighlightTheme,
     ...(Array.isArray(langExtension) ? langExtension : [langExtension]),
     ...mergeExtensions,
   ]}
   ```

**Step 2: Verify manually**

Run: `cd apps/web && bun dev`
Open the app, create or view files with `.py`, `.css`, `.json`, `.html`, `.go` extensions.
Expected: Each file shows appropriate syntax highlighting.

**Step 3: Run existing tests to confirm no regressions**

Run: `cd apps/web && bun test components/`
Expected: All existing component tests PASS.

**Step 4: Commit**

```bash
git add apps/web/components/editor/CodeMirrorEditor.tsx
git commit -m "feat(editor): integrate dynamic language detection — all 20+ languages now highlighted"
```

---

## Phase 2: Project-Wide Find & Replace (P0)

### Task 4: Add replace API endpoint

**Files:**
- Create: `apps/web/app/api/search/replace/route.ts`
- Test: `apps/web/app/api/search/replace/route.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/web/app/api/search/replace/route.test.ts
import { describe, it, expect, mock, beforeEach } from 'bun:test'

// Mock auth
mock.module('@convex-dev/auth/nextjs/server', () => ({
  isAuthenticatedNextjs: () => Promise.resolve(true),
}))

describe('POST /api/search/replace', () => {
  it('rejects unauthenticated requests', async () => {
    mock.module('@convex-dev/auth/nextjs/server', () => ({
      isAuthenticatedNextjs: () => Promise.resolve(false),
    }))

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/search/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: 'test.ts', searchText: 'a', replaceText: 'b' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('rejects missing required fields', async () => {
    mock.module('@convex-dev/auth/nextjs/server', () => ({
      isAuthenticatedNextjs: () => Promise.resolve(true),
    }))

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/search/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: 'test.ts' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test app/api/search/replace/route.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the implementation**

```typescript
// apps/web/app/api/search/replace/route.ts
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { isAuthenticatedNextjs } from '@convex-dev/auth/nextjs/server'

interface ReplaceRequest {
  filePath: string
  searchText: string
  replaceText: string
  isRegex?: boolean
  caseSensitive?: boolean
  replaceAll?: boolean
}

interface ReplaceResult {
  filePath: string
  replacements: number
}

export async function POST(req: Request) {
  if (!(await isAuthenticatedNextjs())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as ReplaceRequest

  if (!body.filePath || body.searchText === undefined || body.replaceText === undefined) {
    return Response.json(
      { error: 'filePath, searchText, and replaceText are required' },
      { status: 400 }
    )
  }

  // Prevent path traversal
  const cwd = process.cwd()
  const absPath = resolve(cwd, body.filePath)
  if (!absPath.startsWith(cwd)) {
    return Response.json({ error: 'Path traversal not allowed' }, { status: 400 })
  }

  try {
    const content = await readFile(absPath, 'utf-8')

    let flags = body.caseSensitive ? 'g' : 'gi'
    if (!body.replaceAll) flags = flags.replace('g', '')

    const pattern = body.isRegex
      ? new RegExp(body.searchText, flags)
      : new RegExp(body.searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)

    let replacements = 0
    const newContent = content.replace(pattern, (...args) => {
      replacements++
      return body.replaceText
    })

    if (replacements > 0) {
      await writeFile(absPath, newContent, 'utf-8')
    }

    const result: ReplaceResult = { filePath: body.filePath, replacements }
    return Response.json(result)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Replace failed' },
      { status: 500 }
    )
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test app/api/search/replace/route.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/app/api/search/replace/
git commit -m "feat(search): add server-side replace API with regex support and path traversal guard"
```

---

### Task 5: Add replace UI to ProjectSearchPanel

**Files:**
- Modify: `apps/web/components/workbench/ProjectSearchPanel.tsx`

**Step 1: Add replace mode toggle and replace input**

In `ProjectSearchPanel.tsx`, make these changes:

1. Add new state variables after existing state (after line ~48):
   ```typescript
   const [replaceText, setReplaceText] = useState('')
   const [isReplaceMode, setIsReplaceMode] = useState(false)
   const [replaceStatus, setReplaceStatus] = useState<string | null>(null)
   ```

2. Add a replace toggle button in the toolbar area (near the mode toggles around line 71). Add a chevron toggle button:
   ```typescript
   <button
     type="button"
     onClick={() => setIsReplaceMode((v) => !v)}
     className={cn(
       'flex h-6 w-6 items-center justify-center rounded-none border border-transparent transition-colors',
       isReplaceMode ? 'bg-surface-2 text-foreground' : 'text-muted-foreground hover:text-foreground'
     )}
     title="Toggle Replace"
   >
     <ChevronDown className={cn('h-3 w-3 transition-transform', isReplaceMode && 'rotate-180')} />
   </button>
   ```

3. Add replace input field below the search input (conditionally rendered):
   ```typescript
   {isReplaceMode && (
     <div className="flex items-center gap-1 px-3 pb-2">
       <input
         type="text"
         value={replaceText}
         onChange={(e) => setReplaceText(e.target.value)}
         placeholder="Replace with..."
         className="flex-1 bg-surface-0 border border-border px-2 py-1 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
       />
       <button
         type="button"
         onClick={() => handleReplaceInFile(null)}
         disabled={!query || results.length === 0}
         className="px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-40"
         title="Replace All in All Files"
       >
         All
       </button>
     </div>
   )}
   ```

4. Add replace handler function:
   ```typescript
   const handleReplaceInFile = async (filePath: string | null) => {
     const targetFiles = filePath
       ? [filePath]
       : [...new Set(results.map((r) => r.file))]

     let totalReplacements = 0
     for (const file of targetFiles) {
       try {
         const res = await fetch('/api/search/replace', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             filePath: file,
             searchText: query,
             replaceText,
             isRegex: mode === 'regex',
             caseSensitive,
             replaceAll: true,
           }),
         })
         const data = await res.json()
         totalReplacements += data.replacements ?? 0
       } catch {
         // skip failed files
       }
     }
     setReplaceStatus(`Replaced ${totalReplacements} occurrence(s)`)
     // Re-trigger search to update results
     // (the existing debounced search will fire on next query change,
     //  or manually trigger by setting a nonce)
   }
   ```

5. Add per-file replace button in the results group header (around line 159-182, next to the file name):
   ```typescript
   {isReplaceMode && (
     <button
       type="button"
       onClick={() => handleReplaceInFile(group.file)}
       className="ml-auto px-1 font-mono text-[10px] uppercase text-muted-foreground hover:text-foreground"
       title={`Replace all in ${group.file}`}
     >
       Replace
     </button>
   )}
   ```

6. Add the `ChevronDown` icon to the lucide-react import at the top of the file.

**Step 2: Verify manually**

Run: `cd apps/web && bun dev`
Open search panel → toggle replace mode → enter search/replace text → click "All" or per-file "Replace".
Expected: Files are modified, results update.

**Step 3: Commit**

```bash
git add apps/web/components/workbench/ProjectSearchPanel.tsx
git commit -m "feat(search): add find & replace UI with per-file and project-wide replace"
```

---

## Phase 3: Git Backend + Panel (P0)

### Task 6: Build git API surface

**Files:**
- Modify: `apps/web/app/api/git/route.ts:25-59`
- Test: `apps/web/app/api/git/route.test.ts` (create if not exists)

**Step 1: Write the failing test**

```typescript
// apps/web/app/api/git/route.test.ts
import { describe, it, expect, mock } from 'bun:test'

mock.module('@convex-dev/auth/nextjs/server', () => ({
  isAuthenticatedNextjs: () => Promise.resolve(true),
}))

describe('POST /api/git', () => {
  it('supports status command', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'status' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('branch')
    expect(body).toHaveProperty('staged')
    expect(body).toHaveProperty('unstaged')
    expect(body).toHaveProperty('untracked')
  })

  it('supports log command', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'log', limit: 5 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('commits')
    expect(Array.isArray(body.commits)).toBe(true)
  })

  it('supports branch-list command', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'branch-list' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('branches')
    expect(body).toHaveProperty('current')
  })

  it('rejects unsupported commands', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'push --force' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test app/api/git/route.test.ts`
Expected: FAIL — "status" command not supported.

**Step 3: Extend the git route**

Replace the body of `POST` in `apps/web/app/api/git/route.ts` with an expanded command set. Keep the existing `restore`, `diff --name-only`, and `write-tree` commands, and add:

```typescript
// apps/web/app/api/git/route.ts
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { isAuthenticatedNextjs } from '@convex-dev/auth/nextjs/server'

const execFileAsync = promisify(execFile)

interface GitRequest {
  action?: 'restore'
  hash?: string
  command?: string
  // For stage/unstage
  paths?: string[]
  // For commit
  message?: string
  // For log
  limit?: number
  // For checkout
  branch?: string
}

async function runGit(args: string[]) {
  const result = await execFileAsync('git', args, {
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024,
  })
  return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 }
}

function isValidHash(hash: string): boolean {
  return /^[0-9a-f]{6,64}$/iu.test(hash)
}

function isValidBranchName(name: string): boolean {
  // Reject shell metacharacters and path traversal
  return /^[a-zA-Z0-9_\-./]+$/.test(name) && !name.includes('..')
}

function isValidPath(p: string): boolean {
  return !p.includes('..') && !p.startsWith('/')
}

export async function POST(req: Request) {
  if (!(await isAuthenticatedNextjs())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as GitRequest

  try {
    // --- Existing: snapshot restore ---
    if (body.action === 'restore') {
      if (!body.hash || !isValidHash(body.hash)) {
        return Response.json({ error: 'Invalid snapshot hash' }, { status: 400 })
      }
      const readTree = await runGit(['read-tree', body.hash])
      const checkout = await runGit(['checkout-index', '-a', '-f'])
      return Response.json({
        stdout: `${readTree.stdout}${checkout.stdout}`,
        stderr: `${readTree.stderr}${checkout.stderr}`,
        exitCode: 0,
      })
    }

    if (!body.command) {
      return Response.json({ error: 'command is required' }, { status: 400 })
    }

    switch (body.command) {
      // --- Existing commands (preserved) ---
      case 'git diff --name-only HEAD':
        return Response.json(await runGit(['diff', '--name-only', 'HEAD']))

      case 'git add -A && git write-tree':
        await runGit(['add', '-A'])
        return Response.json(await runGit(['write-tree']))

      // --- New: status ---
      case 'status': {
        const branchResult = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'])
        const branch = branchResult.stdout.trim()

        const statusResult = await runGit(['status', '--porcelain=v1', '-uall'])
        const lines = statusResult.stdout.split('\n').filter(Boolean)

        const staged: string[] = []
        const unstaged: string[] = []
        const untracked: string[] = []

        for (const line of lines) {
          const x = line[0]  // index status
          const y = line[1]  // worktree status
          const file = line.slice(3)

          if (x === '?' && y === '?') {
            untracked.push(file)
          } else {
            if (x !== ' ' && x !== '?') staged.push(file)
            if (y !== ' ' && y !== '?') unstaged.push(file)
          }
        }

        return Response.json({ branch, staged, unstaged, untracked })
      }

      // --- New: log ---
      case 'log': {
        const limit = Math.min(body.limit ?? 20, 100)
        const logResult = await runGit([
          'log',
          `--max-count=${limit}`,
          '--format=%H%x00%an%x00%ae%x00%aI%x00%s',
        ])
        const commits = logResult.stdout
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [hash, author, email, date, message] = line.split('\x00')
            return { hash, author, email, date, message }
          })

        return Response.json({ commits })
      }

      // --- New: branch-list ---
      case 'branch-list': {
        const currentResult = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'])
        const current = currentResult.stdout.trim()

        const branchesResult = await runGit(['branch', '--format=%(refname:short)'])
        const branches = branchesResult.stdout.split('\n').filter(Boolean)

        return Response.json({ current, branches })
      }

      // --- New: stage ---
      case 'stage': {
        if (!body.paths?.length || !body.paths.every(isValidPath)) {
          return Response.json({ error: 'Valid paths[] required' }, { status: 400 })
        }
        return Response.json(await runGit(['add', '--', ...body.paths]))
      }

      // --- New: unstage ---
      case 'unstage': {
        if (!body.paths?.length || !body.paths.every(isValidPath)) {
          return Response.json({ error: 'Valid paths[] required' }, { status: 400 })
        }
        return Response.json(await runGit(['reset', 'HEAD', '--', ...body.paths]))
      }

      // --- New: commit ---
      case 'commit': {
        if (!body.message || body.message.length > 1000) {
          return Response.json({ error: 'message required (max 1000 chars)' }, { status: 400 })
        }
        return Response.json(await runGit(['commit', '-m', body.message]))
      }

      // --- New: checkout branch ---
      case 'checkout': {
        if (!body.branch || !isValidBranchName(body.branch)) {
          return Response.json({ error: 'Valid branch name required' }, { status: 400 })
        }
        return Response.json(await runGit(['checkout', body.branch]))
      }

      // --- New: diff (staged) ---
      case 'diff-staged':
        return Response.json(await runGit(['diff', '--cached']))

      // --- New: diff (unstaged) ---
      case 'diff-unstaged':
        return Response.json(await runGit(['diff']))

      default:
        return Response.json({ error: 'Unsupported git command' }, { status: 400 })
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Git command failed' },
      { status: 400 }
    )
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test app/api/git/route.test.ts`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add apps/web/app/api/git/route.ts apps/web/app/api/git/route.test.ts
git commit -m "feat(git): expand API with status, log, branch-list, stage, unstage, commit, checkout, diff"
```

---

### Task 7: Create useGit hook

**Files:**
- Create: `apps/web/hooks/useGit.ts`
- Test: `apps/web/hooks/useGit.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/web/hooks/useGit.test.ts
import { describe, it, expect, mock, beforeEach } from 'bun:test'

// We test the raw fetch functions, not the React hook
// (React hook testing requires a component harness)

describe('git API client functions', () => {
  it('exports gitStatus function', async () => {
    const mod = await import('./useGit')
    expect(typeof mod.gitStatus).toBe('function')
  })

  it('exports gitLog function', async () => {
    const mod = await import('./useGit')
    expect(typeof mod.gitLog).toBe('function')
  })

  it('exports gitBranches function', async () => {
    const mod = await import('./useGit')
    expect(typeof mod.gitBranches).toBe('function')
  })

  it('exports gitStage function', async () => {
    const mod = await import('./useGit')
    expect(typeof mod.gitStage).toBe('function')
  })

  it('exports gitUnstage function', async () => {
    const mod = await import('./useGit')
    expect(typeof mod.gitUnstage).toBe('function')
  })

  it('exports gitCommit function', async () => {
    const mod = await import('./useGit')
    expect(typeof mod.gitCommit).toBe('function')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test hooks/useGit.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the implementation**

```typescript
// apps/web/hooks/useGit.ts
'use client'

import { useState, useCallback } from 'react'

// --- Raw API client functions (exported for testability) ---

export interface GitStatusResult {
  branch: string
  staged: string[]
  unstaged: string[]
  untracked: string[]
}

export interface GitCommitEntry {
  hash: string
  author: string
  email: string
  date: string
  message: string
}

async function gitCommand(body: Record<string, unknown>) {
  const res = await fetch('/api/git', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || `Git command failed: ${res.status}`)
  }
  return res.json()
}

export async function gitStatus(): Promise<GitStatusResult> {
  return gitCommand({ command: 'status' })
}

export async function gitLog(limit = 20): Promise<{ commits: GitCommitEntry[] }> {
  return gitCommand({ command: 'log', limit })
}

export async function gitBranches(): Promise<{ current: string; branches: string[] }> {
  return gitCommand({ command: 'branch-list' })
}

export async function gitStage(paths: string[]): Promise<void> {
  await gitCommand({ command: 'stage', paths })
}

export async function gitUnstage(paths: string[]): Promise<void> {
  await gitCommand({ command: 'unstage', paths })
}

export async function gitCommit(message: string): Promise<void> {
  await gitCommand({ command: 'commit', message })
}

export async function gitCheckout(branch: string): Promise<void> {
  await gitCommand({ command: 'checkout', branch })
}

export async function gitDiffStaged(): Promise<string> {
  const result = await gitCommand({ command: 'diff-staged' })
  return result.stdout || ''
}

export async function gitDiffUnstaged(): Promise<string> {
  const result = await gitCommand({ command: 'diff-unstaged' })
  return result.stdout || ''
}

// --- React hook ---

export function useGit() {
  const [status, setStatus] = useState<GitStatusResult | null>(null)
  const [log, setLog] = useState<GitCommitEntry[]>([])
  const [branches, setBranches] = useState<{ current: string; branches: string[] } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshStatus = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await gitStatus()
      setStatus(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get git status')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshLog = useCallback(async (limit = 20) => {
    try {
      const result = await gitLog(limit)
      setLog(result.commits)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get git log')
    }
  }, [])

  const refreshBranches = useCallback(async () => {
    try {
      const result = await gitBranches()
      setBranches(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to list branches')
    }
  }, [])

  const stage = useCallback(async (paths: string[]) => {
    await gitStage(paths)
    await refreshStatus()
  }, [refreshStatus])

  const unstage = useCallback(async (paths: string[]) => {
    await gitUnstage(paths)
    await refreshStatus()
  }, [refreshStatus])

  const commit = useCallback(async (message: string) => {
    await gitCommit(message)
    await refreshStatus()
    await refreshLog()
  }, [refreshStatus, refreshLog])

  const checkout = useCallback(async (branch: string) => {
    await gitCheckout(branch)
    await refreshStatus()
    await refreshBranches()
  }, [refreshStatus, refreshBranches])

  return {
    status,
    log,
    branches,
    isLoading,
    error,
    refreshStatus,
    refreshLog,
    refreshBranches,
    stage,
    unstage,
    commit,
    checkout,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test hooks/useGit.test.ts`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add apps/web/hooks/useGit.ts apps/web/hooks/useGit.test.ts
git commit -m "feat(git): add useGit hook with status, log, stage, unstage, commit, checkout"
```

---

### Task 8: Rewrite SidebarGitPanel with real git integration

**Files:**
- Modify: `apps/web/components/sidebar/SidebarGitPanel.tsx:1-69` (full rewrite)

**Step 1: Rewrite the component**

Replace the entire `SidebarGitPanel.tsx` with a component that uses the `useGit` hook:

```typescript
// apps/web/components/sidebar/SidebarGitPanel.tsx
'use client'

import { useEffect, useState } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import {
  Check,
  ChevronDown,
  ChevronRight,
  GitBranch,
  GitCommitHorizontal,
  Minus,
  Plus,
  RefreshCw,
  Undo2,
} from 'lucide-react'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useGit } from '@/hooks/useGit'

interface SidebarGitPanelProps {
  projectId: Id<'projects'>
}

export function SidebarGitPanel({ projectId }: SidebarGitPanelProps) {
  const {
    status,
    log,
    isLoading,
    error,
    refreshStatus,
    refreshLog,
    stage,
    unstage,
    commit,
  } = useGit()

  const [commitMessage, setCommitMessage] = useState('')
  const [showLog, setShowLog] = useState(false)
  const [stagedExpanded, setStagedExpanded] = useState(true)
  const [unstagedExpanded, setUnstagedExpanded] = useState(true)
  const [untrackedExpanded, setUntrackedExpanded] = useState(true)

  // Fetch status on mount
  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const handleStageFile = async (path: string) => {
    await stage([path])
  }

  const handleUnstageFile = async (path: string) => {
    await unstage([path])
  }

  const handleStageAll = async () => {
    const allPaths = [
      ...(status?.unstaged ?? []),
      ...(status?.untracked ?? []),
    ]
    if (allPaths.length > 0) await stage(allPaths)
  }

  const handleCommit = async () => {
    if (!commitMessage.trim()) return
    await commit(commitMessage.trim())
    setCommitMessage('')
  }

  const totalChanges =
    (status?.staged.length ?? 0) +
    (status?.unstaged.length ?? 0) +
    (status?.untracked.length ?? 0)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-xs text-foreground">
            {status?.branch ?? '...'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={() => { refreshStatus(); refreshLog(10) }}
          disabled={isLoading}
          title="Refresh"
        >
          <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-1.5 font-mono text-[10px] text-destructive">
          {error}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-1">
          {/* Staged Changes */}
          {(status?.staged.length ?? 0) > 0 && (
            <FileSection
              title="Staged Changes"
              count={status!.staged.length}
              expanded={stagedExpanded}
              onToggle={() => setStagedExpanded((v) => !v)}
              files={status!.staged}
              actionIcon={<Minus className="h-3 w-3" />}
              actionTitle="Unstage"
              onAction={handleUnstageFile}
              statusColor="text-success"
            />
          )}

          {/* Unstaged Changes */}
          {(status?.unstaged.length ?? 0) > 0 && (
            <FileSection
              title="Changes"
              count={status!.unstaged.length}
              expanded={unstagedExpanded}
              onToggle={() => setUnstagedExpanded((v) => !v)}
              files={status!.unstaged}
              actionIcon={<Plus className="h-3 w-3" />}
              actionTitle="Stage"
              onAction={handleStageFile}
              statusColor="text-warning"
            />
          )}

          {/* Untracked */}
          {(status?.untracked.length ?? 0) > 0 && (
            <FileSection
              title="Untracked"
              count={status!.untracked.length}
              expanded={untrackedExpanded}
              onToggle={() => setUntrackedExpanded((v) => !v)}
              files={status!.untracked}
              actionIcon={<Plus className="h-3 w-3" />}
              actionTitle="Stage"
              onAction={handleStageFile}
              statusColor="text-muted-foreground"
            />
          )}

          {/* Empty state */}
          {totalChanges === 0 && !isLoading && (
            <div className="px-3 py-6 text-center font-mono text-xs text-muted-foreground">
              No changes
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Commit area */}
      {(status?.staged.length ?? 0) > 0 && (
        <div className="border-t border-border p-2">
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message..."
            className="mb-1.5 w-full resize-none bg-surface-0 border border-border px-2 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleCommit()
              }
            }}
          />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 flex-1 gap-1 rounded-none border border-border font-mono text-[10px] uppercase tracking-widest"
              onClick={handleCommit}
              disabled={!commitMessage.trim()}
            >
              <GitCommitHorizontal className="h-3 w-3" />
              Commit
            </Button>
          </div>
        </div>
      )}

      {/* Stage All button when there are unstaged changes */}
      {totalChanges > 0 && (status?.staged.length ?? 0) === 0 && (
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-full gap-1 rounded-none border border-border font-mono text-[10px] uppercase tracking-widest"
            onClick={handleStageAll}
          >
            <Plus className="h-3 w-3" />
            Stage All
          </Button>
        </div>
      )}

      {/* Log toggle */}
      <div className="border-t border-border">
        <button
          type="button"
          className="flex w-full items-center gap-1 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          onClick={() => {
            setShowLog((v) => !v)
            if (!showLog && log.length === 0) refreshLog(10)
          }}
        >
          {showLog ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Recent Commits
        </button>
        {showLog && (
          <ScrollArea className="max-h-40">
            <div className="px-1 pb-1">
              {log.map((entry) => (
                <div
                  key={entry.hash}
                  className="flex items-start gap-2 px-2 py-1.5"
                >
                  <GitCommitHorizontal className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs text-foreground">
                      {entry.message}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {entry.hash.slice(0, 7)} · {entry.author}
                    </div>
                  </div>
                </div>
              ))}
              {log.length === 0 && (
                <div className="px-2 py-2 font-mono text-[10px] text-muted-foreground">
                  No commits yet
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}

// --- File section sub-component ---

function FileSection({
  title,
  count,
  expanded,
  onToggle,
  files,
  actionIcon,
  actionTitle,
  onAction,
  statusColor,
}: {
  title: string
  count: number
  expanded: boolean
  onToggle: () => void
  files: string[]
  actionIcon: React.ReactNode
  actionTitle: string
  onAction: (path: string) => void
  statusColor: string
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {title} ({count})
      </button>
      {expanded &&
        files.map((file) => (
          <div
            key={file}
            className="group flex items-center gap-2 px-3 py-1 hover:bg-surface-2"
          >
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusColor.replace('text-', 'bg-'))} />
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
              {file}
            </span>
            <button
              type="button"
              onClick={() => onAction(file)}
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground"
              title={actionTitle}
            >
              {actionIcon}
            </button>
          </div>
        ))}
    </div>
  )
}
```

**Step 2: Wire branch to StatusBar**

In the parent component that renders `StatusBar`, pass the `status.branch` from `useGit` instead of a hardcoded value. The `StatusBar` component already accepts a `branch?: string` prop (line 23 of StatusBar.tsx). Find where `StatusBar` is rendered (in the project page or workspace layout) and wire it.

Look in `apps/web/app/(dashboard)/projects/[projectId]/page.tsx` or `apps/web/components/projects/ProjectWorkspaceLayout.tsx` for where `StatusBar` is rendered, and pass the live branch from `useGit().status?.branch`.

**Step 3: Verify manually**

Run: `cd apps/web && bun dev`
Open the app → navigate to a project → click Git icon in sidebar rail.
Expected: Real branch name, real staged/unstaged/untracked files, stage/unstage buttons, commit message box, recent commits log.

**Step 4: Commit**

```bash
git add apps/web/components/sidebar/SidebarGitPanel.tsx apps/web/hooks/useGit.ts
git commit -m "feat(git): rewrite SidebarGitPanel with real git integration — status, stage, commit, log"
```

---

## Phase 4: Per-Hunk Diff Accept/Reject (P1)

### Task 9: Add hunk-level controls to DiffViewer

**Files:**
- Modify: `apps/web/components/diff/DiffViewer.tsx`
- Reference: `apps/web/lib/chat/parseGitDiff.ts` (existing hunk parser)

**Step 1: Read the existing DiffViewer**

Read `apps/web/components/diff/DiffViewer.tsx` to understand the current implementation. The existing component shows Apply/Reject for the entire diff. The task is to add per-hunk Accept/Reject buttons.

**Step 2: Modify DiffViewer to render per-hunk controls**

Add an `onAcceptHunk?: (hunkIndex: number) => void` and `onRejectHunk?: (hunkIndex: number) => void` prop. For each hunk section in the diff display, render Accept/Reject buttons in the hunk header row (the `@@ ... @@` line). Example:

```typescript
// In the hunk header rendering:
<div className="flex items-center justify-between bg-surface-1 px-2 py-1 border-y border-border">
  <span className="font-mono text-[10px] text-muted-foreground">
    @@ -{hunk.oldStart},{hunk.oldCount} +{hunk.newStart},{hunk.newCount} @@
  </span>
  {(onAcceptHunk || onRejectHunk) && (
    <div className="flex items-center gap-1">
      {onAcceptHunk && (
        <button
          type="button"
          onClick={() => onAcceptHunk(hunkIndex)}
          className="flex items-center gap-0.5 px-1.5 py-0.5 font-mono text-[10px] text-success hover:bg-success/10"
          title="Accept this change"
        >
          <Check className="h-3 w-3" /> Accept
        </button>
      )}
      {onRejectHunk && (
        <button
          type="button"
          onClick={() => onRejectHunk(hunkIndex)}
          className="flex items-center gap-0.5 px-1.5 py-0.5 font-mono text-[10px] text-destructive hover:bg-destructive/10"
          title="Reject this change"
        >
          <X className="h-3 w-3" /> Reject
        </button>
      )}
    </div>
  )}
</div>
```

**Step 3: Add hunk application logic**

Create a utility function that applies a single hunk from a parsed diff to file content:

```typescript
// apps/web/lib/chat/applyHunk.ts
import type { GitDiffHunk } from './parseGitDiff'

/**
 * Applies a single hunk to the given file content.
 * Returns the modified content.
 */
export function applyHunk(content: string, hunk: GitDiffHunk): string {
  const lines = content.split('\n')
  // oldStart is 1-indexed
  const startIdx = hunk.oldStart - 1

  // Remove old lines, insert new lines
  const oldLines = hunk.lines
    .filter((l) => l.type === 'remove' || l.type === 'context')
    .map((l) => l.content)
  const newLines = hunk.lines
    .filter((l) => l.type === 'add' || l.type === 'context')
    .map((l) => l.content)

  lines.splice(startIdx, oldLines.length, ...newLines)
  return lines.join('\n')
}
```

**Step 4: Write test for applyHunk**

```typescript
// apps/web/lib/chat/applyHunk.test.ts
import { describe, it, expect } from 'bun:test'
import { applyHunk } from './applyHunk'
import type { GitDiffHunk } from './parseGitDiff'

describe('applyHunk', () => {
  it('applies an addition hunk', () => {
    const content = 'line1\nline2\nline3'
    const hunk: GitDiffHunk = {
      oldStart: 2,
      oldCount: 1,
      newStart: 2,
      newCount: 2,
      lines: [
        { type: 'context', content: 'line2' },
        { type: 'add', content: 'inserted' },
      ],
    }
    const result = applyHunk(content, hunk)
    expect(result).toBe('line1\nline2\ninserted\nline3')
  })

  it('applies a removal hunk', () => {
    const content = 'line1\nline2\nline3'
    const hunk: GitDiffHunk = {
      oldStart: 2,
      oldCount: 1,
      newStart: 2,
      newCount: 0,
      lines: [
        { type: 'remove', content: 'line2' },
      ],
    }
    const result = applyHunk(content, hunk)
    expect(result).toBe('line1\nline3')
  })
})
```

**Step 5: Run tests**

Run: `cd apps/web && bun test lib/chat/applyHunk.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add apps/web/components/diff/DiffViewer.tsx apps/web/lib/chat/applyHunk.ts apps/web/lib/chat/applyHunk.test.ts
git commit -m "feat(diff): add per-hunk accept/reject controls and hunk application utility"
```

---

## Phase 5: Symbol-Level Breadcrumbs (P1)

### Task 10: Add symbol extraction utility

**Files:**
- Create: `apps/web/lib/editor/symbol-extractor.ts`
- Test: `apps/web/lib/editor/symbol-extractor.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/web/lib/editor/symbol-extractor.test.ts
import { describe, it, expect } from 'bun:test'
import { extractSymbolAtLine } from './symbol-extractor'

describe('extractSymbolAtLine', () => {
  const tsCode = `
import React from 'react'

interface Props {
  name: string
}

export function MyComponent({ name }: Props) {
  const [count, setCount] = useState(0)

  const handleClick = () => {
    setCount(c => c + 1)
  }

  return <div>{name}</div>
}

export class UserService {
  async getUser(id: string) {
    return { id }
  }
}
`.trim()

  it('returns function name when cursor is inside a function', () => {
    // Line 9 is inside MyComponent body (const [count...])
    const result = extractSymbolAtLine(tsCode, 9, 'tsx')
    expect(result).toEqual({ name: 'MyComponent', kind: 'function' })
  })

  it('returns class name when cursor is inside a class', () => {
    // Line 19 is inside UserService (async getUser)
    const result = extractSymbolAtLine(tsCode, 19, 'tsx')
    expect(result?.name).toBe('UserService')
    expect(result?.kind).toBe('class')
  })

  it('returns interface name when cursor is inside an interface', () => {
    // Line 4 is inside Props interface
    const result = extractSymbolAtLine(tsCode, 4, 'tsx')
    expect(result?.name).toBe('Props')
    expect(result?.kind).toBe('interface')
  })

  it('returns null when cursor is at top level', () => {
    // Line 1 is the import
    const result = extractSymbolAtLine(tsCode, 1, 'tsx')
    expect(result).toBeNull()
  })

  it('handles nested functions — returns innermost', () => {
    // Line 11 is inside handleClick (nested in MyComponent)
    const result = extractSymbolAtLine(tsCode, 11, 'tsx')
    expect(result?.name).toBe('handleClick')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test lib/editor/symbol-extractor.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the implementation**

```typescript
// apps/web/lib/editor/symbol-extractor.ts

export interface SymbolInfo {
  name: string
  kind: 'function' | 'class' | 'interface' | 'type' | 'enum' | 'method' | 'variable'
  startLine: number
  endLine: number
}

/**
 * Extracts the innermost symbol (function, class, interface) containing
 * the given line number (1-indexed).
 *
 * Uses regex-based heuristics — not a full AST parser, but good enough
 * for breadcrumb display in TS/JS/TSX/JSX files.
 */
export function extractSymbolAtLine(
  code: string,
  line: number,
  _language: string
): SymbolInfo | null {
  const lines = code.split('\n')
  const symbols = extractSymbols(lines)

  // Find all symbols that contain this line, return innermost (most specific)
  const containing = symbols
    .filter((s) => line >= s.startLine && line <= s.endLine)
    .sort((a, b) => (b.startLine - a.startLine) || (a.endLine - b.endLine))

  return containing[0] ?? null
}

/**
 * Extracts all top-level and nested symbol definitions from source code.
 */
function extractSymbols(lines: string[]): SymbolInfo[] {
  const symbols: SymbolInfo[] = []
  const braceStack: Array<{ name: string; kind: SymbolInfo['kind']; startLine: number; depth: number }> = []
  let braceDepth = 0

  const patterns: Array<{ regex: RegExp; kind: SymbolInfo['kind'] }> = [
    { regex: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/, kind: 'function' },
    { regex: /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/, kind: 'function' },
    { regex: /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>/, kind: 'function' },
    { regex: /(?:export\s+)?class\s+(\w+)/, kind: 'class' },
    { regex: /(?:export\s+)?interface\s+(\w+)/, kind: 'interface' },
    { regex: /(?:export\s+)?type\s+(\w+)\s*=/, kind: 'type' },
    { regex: /(?:export\s+)?enum\s+(\w+)/, kind: 'enum' },
    { regex: /^\s+(?:async\s+)?(\w+)\s*\(/, kind: 'method' },
  ]

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i]
    const lineNum = i + 1

    // Check for symbol definitions
    for (const { regex, kind } of patterns) {
      const match = lineText.match(regex)
      if (match && match[1]) {
        // If line also opens a brace, we'll track it
        if (lineText.includes('{')) {
          braceStack.push({ name: match[1], kind, startLine: lineNum, depth: braceDepth })
        }
      }
    }

    // Track brace depth
    for (const ch of lineText) {
      if (ch === '{') braceDepth++
      if (ch === '}') {
        braceDepth--
        // Check if this closes a tracked symbol
        const top = braceStack[braceStack.length - 1]
        if (top && braceDepth === top.depth) {
          braceStack.pop()
          symbols.push({
            name: top.name,
            kind: top.kind,
            startLine: top.startLine,
            endLine: lineNum,
          })
        }
      }
    }
  }

  return symbols
}

/**
 * Extract all symbols from code (for outline view).
 */
export function extractAllSymbols(code: string, _language: string): SymbolInfo[] {
  return extractSymbols(code.split('\n'))
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test lib/editor/symbol-extractor.test.ts`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add apps/web/lib/editor/symbol-extractor.ts apps/web/lib/editor/symbol-extractor.test.ts
git commit -m "feat(editor): add regex-based symbol extractor for breadcrumb display"
```

---

### Task 11: Wire symbol breadcrumb into the editor area

**Files:**
- Modify: `apps/web/components/workbench/Breadcrumb.tsx:7-12,85-107`
- Modify: Parent component that renders `Breadcrumb` (the project page or `EditorContainer`)

**Step 1: Add symbol prop to BreadcrumbItem**

In `Breadcrumb.tsx`, the `BreadcrumbItem` interface (line 7) already has `label`, `path`, `isFile`, `folderPath`. Add:

```typescript
export interface BreadcrumbItem {
  label: string
  path?: string
  isFile?: boolean
  folderPath?: string
  isSymbol?: boolean  // NEW
}
```

In the rendering loop (around line 49-80), add a special case for symbol items — render them with a different icon (e.g., a code bracket or hash icon) and styling:

```typescript
// After the existing file/folder rendering:
{item.isSymbol ? (
  <span className="flex items-center gap-1 font-mono text-xs text-primary/70">
    <span className="text-[10px]">#</span>
    {item.label}
  </span>
) : /* existing rendering */ }
```

**Step 2: Modify buildBreadcrumbItems to accept optional symbol**

In `buildBreadcrumbItems` (line 85), add an optional `symbol` parameter:

```typescript
export function buildBreadcrumbItems(
  filePath: string | null,
  basePath: string = '',
  symbol?: { name: string; kind: string } | null
): BreadcrumbItem[] {
  if (!filePath) return []

  const parts = filePath.split('/')
  const items = parts.map((part, index) => {
    const isFile = index === parts.length - 1
    const folderPath = isFile
      ? undefined
      : basePath
        ? `${basePath}/${parts.slice(0, index + 1).join('/')}`
        : parts.slice(0, index + 1).join('/')

    return { label: part, isFile, folderPath }
  })

  // Append symbol if provided
  if (symbol) {
    items.push({ label: symbol.name, isSymbol: true })
  }

  return items
}
```

**Step 3: Wire symbol extraction to cursor position changes**

In the parent component that renders `Breadcrumb` (the project page), use the `extractSymbolAtLine` function with the current cursor position and file content:

```typescript
import { extractSymbolAtLine } from '@/lib/editor/symbol-extractor'

// Inside the component, derive the current symbol:
const currentSymbol = useMemo(() => {
  if (!cursorPosition || !fileContent || !selectedFilePath) return null
  return extractSymbolAtLine(fileContent, cursorPosition.line, selectedFilePath.split('.').pop() || '')
}, [cursorPosition?.line, fileContent, selectedFilePath])

// Pass to buildBreadcrumbItems:
const breadcrumbItems = buildBreadcrumbItems(selectedFilePath, '', currentSymbol)
```

**Step 4: Verify manually**

Run: `cd apps/web && bun dev`
Open a TypeScript file → move cursor inside a function.
Expected: Breadcrumb shows `project > folder > file.tsx > FunctionName`.

**Step 5: Commit**

```bash
git add apps/web/components/workbench/Breadcrumb.tsx apps/web/app/
git commit -m "feat(editor): add symbol-level breadcrumb — shows current function/class at cursor position"
```

---

## Verification Checklist

After all tasks are complete, verify:

- [ ] Open a `.py` file → syntax highlighting works
- [ ] Open a `.css` file → syntax highlighting works
- [ ] Open a `.json` file → syntax highlighting works
- [ ] Open a `.go` file → syntax highlighting works
- [ ] Open a `.rs` file → syntax highlighting works
- [ ] Open a `.md` file → syntax highlighting works
- [ ] Search panel → toggle replace → enter text → "Replace" per-file works
- [ ] Search panel → "All" replaces across all matching files
- [ ] Git sidebar → shows real branch name (not hardcoded "main")
- [ ] Git sidebar → shows staged / unstaged / untracked files
- [ ] Git sidebar → stage a file → appears in staged section
- [ ] Git sidebar → unstage a file → moves back
- [ ] Git sidebar → type commit message + Cmd+Enter → commits
- [ ] Git sidebar → recent commits show real commit log
- [ ] StatusBar → shows real branch name
- [ ] Diff viewer → per-hunk Accept/Reject buttons appear on each `@@` header
- [ ] Breadcrumb → shows symbol name when cursor is inside a function/class
- [ ] All existing tests pass: `cd apps/web && bun test app components hooks lib`
