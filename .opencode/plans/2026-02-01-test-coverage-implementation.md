# Complete Test Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Bootstrap comprehensive test coverage from 0.18% (13 tests) to 60%+ by
adding unit tests for core utilities, Convex functions, UI components, and
integration tests for critical user flows.

**Architecture:**

- Use Bun's built-in test runner (already configured)
- Implement test utilities and mocks for Convex, React components, and LLM
  providers
- Follow testing pyramid: 70% unit tests, 20% integration tests, 10% E2E tests
- Add coverage reporting with Istanbul/c8
- Test files co-located with source files using `.test.ts` pattern

**Tech Stack:**

- Bun test runner (built-in)
- @testing-library/react for component tests
- Jest-DOM matchers for DOM assertions
- Convex test utilities
- c8 for coverage reporting

---

## Current State Analysis

**Metrics:**

- Total TypeScript files: ~7,384
- Current test files: 4
- Current tests: 13
- Current coverage: ~0.18%
- Target coverage: 60% (Month 1), 80% (Month 3)

**Existing Tests:**

- `lib/chat/planDraft.test.ts`
- `lib/agent/runtime.plan-mode.test.ts`
- `lib/agent/runtime.build-mode.test.ts`
- `lib/agent/automationPolicy.test.ts`

---

## Phase 1: Testing Infrastructure

### Task 1: Fix Test Script Configuration

**Files:**

- Modify: `apps/web/package.json`

**Step 1: Update test script**

Current broken script:

```json
"test": "bun test --exclude 'e2e/**'"
```

Replace with:

```json
"test": "bun test",
"test:watch": "bun test --watch",
"test:coverage": "bun test --coverage"
```

**Step 2: Verify it works**

Run:

```bash
cd /home/nochaserz/Documents/Coding Projects/panda/apps/web
bun test
```

Expected: All 13 existing tests pass

**Step 3: Commit**

```bash
git add apps/web/package.json
git commit -m "chore(test): fix test script configuration"
```

---

### Task 2: Create Testing Utilities

**Files:**

- Create: `apps/web/lib/test-utils.tsx`
- Create: `apps/web/lib/test-utils/ConvexMock.ts`
- Create: `apps/web/lib/test-utils/index.ts`

**Step 1: Create test utilities for React components**

Create `apps/web/lib/test-utils.tsx`:

```typescript
import React, { ReactElement } from 'react'
import { render as rtlRender, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Custom render that wraps with necessary providers
function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const user = userEvent.setup()

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    // Add any providers needed (ThemeProvider, ConvexProvider, etc.)
    <>{children}</>
  )

  return {
    user,
    ...rtlRender(ui, { wrapper: Wrapper, ...options }),
  }
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { render }
```

**Step 2: Create Convex mock utilities**

Create `apps/web/lib/test-utils/ConvexMock.ts`:

```typescript
import type { DataModel } from '@convex/_generated/dataModel'

export class ConvexMock {
  private data: Map<string, any[]> = new Map()
  private idCounter = 0

  generateId(tableName: string): string {
    return `${tableName}-${++this.idCounter}`
  }

  insert(table: string, doc: any): string {
    const id = this.generateId(table)
    if (!this.data.has(table)) {
      this.data.set(table, [])
    }
    this.data.get(table)!.push({ _id: id, ...doc })
    return id
  }

  get(table: string, id: string): any | null {
    const docs = this.data.get(table) || []
    return docs.find((d) => d._id === id) || null
  }

  query(table: string): any[] {
    return this.data.get(table) || []
  }

  patch(table: string, id: string, updates: any): void {
    const docs = this.data.get(table) || []
    const doc = docs.find((d) => d._id === id)
    if (doc) {
      Object.assign(doc, updates)
    }
  }

  delete(table: string, id: string): void {
    const docs = this.data.get(table) || []
    const index = docs.findIndex((d) => d._id === id)
    if (index > -1) {
      docs.splice(index, 1)
    }
  }

  clear(): void {
    this.data.clear()
    this.idCounter = 0
  }
}

export function createMockConvex(): ConvexMock {
  return new ConvexMock()
}
```

**Step 3: Create index file**

Create `apps/web/lib/test-utils/index.ts`:

```typescript
export { render } from './test-utils'
export { createMockConvex, ConvexMock } from './ConvexMock'
```

**Step 4: Install testing dependencies**

```bash
cd /home/nochaserz/Documents/Coding Projects/panda/apps/web
bun add -d @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Step 5: Commit**

```bash
git add apps/web/lib/test-utils/
git commit -m "feat(test): add testing utilities and mocks"
```

---

### Task 3: Setup Coverage Reporting

**Files:**

- Create: `apps/web/vitest.config.ts` (if switching to vitest) OR
- Modify: Testing configuration for c8

**Step 1: Add coverage configuration**

Create `apps/web/test-coverage.json`:

```json
{
  "reporter": ["text", "html", "json"],
  "reportDir": "./coverage",
  "exclude": [
    "node_modules/**",
    "convex/_generated/**",
    "**/*.test.ts",
    "**/*.test.tsx",
    "e2e/**",
    "coverage/**"
  ],
  "thresholds": {
    "lines": 60,
    "functions": 60,
    "branches": 50,
    "statements": 60
  }
}
```

**Step 2: Add coverage script to package.json**

```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "test:coverage:report": "bun test --coverage && open coverage/index.html"
  }
}
```

**Step 3: Add coverage to .gitignore**

Append to `.gitignore`:

```
# Test coverage
coverage/
*.lcov
```

**Step 4: Commit**

```bash
git add apps/web/test-coverage.json apps/web/package.json .gitignore
git commit -m "feat(test): setup coverage reporting with thresholds"
```

---

## Phase 2: Core Utility Tests

### Task 4: Test Utility Functions (lib/)

**Files:**

- Create: `apps/web/lib/utils.test.ts`
- Create: `apps/web/lib/diff.test.ts`
- Create: `apps/web/lib/chat/planDraft.test.ts` (already exists, add more tests)

**Step 1: Test utils.ts (cn function)**

Create `apps/web/lib/utils.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { cn } from './utils'

describe('cn (className utility)', () => {
  test('merges basic classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  test('handles conditional classes', () => {
    expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar')
  })

  test('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  test('handles objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  test('merges tailwind classes correctly', () => {
    expect(cn('p-4', 'p-6')).toBe('p-6')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  test('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })
})
```

**Step 2: Test diff.ts**

Create `apps/web/lib/diff.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { computeDiff, applyDiff, type DiffResult } from './diff'

describe('computeDiff', () => {
  test('returns empty diff for identical strings', () => {
    const result = computeDiff('hello', 'hello')
    expect(result.changes).toHaveLength(0)
    expect(result.hasChanges).toBe(false)
  })

  test('detects added lines', () => {
    const oldText = 'line1'
    const newText = 'line1\nline2'
    const result = computeDiff(oldText, newText)
    expect(result.hasChanges).toBe(true)
    expect(result.changes.some((c) => c.type === 'add')).toBe(true)
  })

  test('detects removed lines', () => {
    const oldText = 'line1\nline2'
    const newText = 'line1'
    const result = computeDiff(oldText, newText)
    expect(result.hasChanges).toBe(true)
    expect(result.changes.some((c) => c.type === 'remove')).toBe(true)
  })

  test('detects modified lines', () => {
    const oldText = 'line1\nold line'
    const newText = 'line1\nnew line'
    const result = computeDiff(oldText, newText)
    expect(result.hasChanges).toBe(true)
    expect(result.changes.some((c) => c.type === 'modify')).toBe(true)
  })
})

describe('applyDiff', () => {
  test('applies additions correctly', () => {
    const original = 'line1'
    const diff: DiffResult = {
      changes: [{ type: 'add', line: 1, content: 'line2' }],
      hasChanges: true,
    }
    expect(applyDiff(original, diff)).toBe('line1\nline2')
  })

  test('applies removals correctly', () => {
    const original = 'line1\nline2'
    const diff: DiffResult = {
      changes: [{ type: 'remove', line: 1, content: 'line2' }],
      hasChanges: true,
    }
    expect(applyDiff(original, diff)).toBe('line1')
  })
})
```

**Step 3: Add more tests to planDraft.test.ts**

Add to existing `apps/web/lib/chat/planDraft.test.ts`:

```typescript
describe('buildMessageWithPlanDraft', () => {
  test('includes plan draft when provided', () => {
    const plan = '1. Do this\n2. Do that'
    const message = 'Implement the feature'
    const result = buildMessageWithPlanDraft(plan, message)
    expect(result).toContain(plan)
    expect(result).toContain(message)
  })

  test('returns just message when no plan', () => {
    const message = 'Implement the feature'
    const result = buildMessageWithPlanDraft('', message)
    expect(result).toBe(message)
  })
})

describe('deriveNextPlanDraft', () => {
  test('extracts plan from assistant message', () => {
    const messages = [
      {
        role: 'assistant' as const,
        content: 'Plan:\n1. Step one\n2. Step two',
        mode: 'discuss' as const,
      },
    ]
    const result = deriveNextPlanDraft({
      mode: 'discuss',
      agentStatus: 'complete',
      currentPlanDraft: '',
      messages,
    })
    expect(result).toContain('1. Step one')
    expect(result).toContain('2. Step two')
  })

  test('returns null when no plan detected', () => {
    const messages = [
      {
        role: 'assistant' as const,
        content: 'Just chatting',
        mode: 'discuss' as const,
      },
    ]
    const result = deriveNextPlanDraft({
      mode: 'discuss',
      agentStatus: 'complete',
      currentPlanDraft: '',
      messages,
    })
    expect(result).toBeNull()
  })
})
```

**Step 4: Run and verify**

```bash
bun test lib/utils.test.ts lib/diff.test.ts lib/chat/planDraft.test.ts
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add apps/web/lib/utils.test.ts apps/web/lib/diff.test.ts
git add apps/web/lib/chat/planDraft.test.ts
git commit -m "test: add tests for core utility functions"
```

---

### Task 5: Test LLM Provider Registry

**Files:**

- Create: `apps/web/lib/llm/registry.test.ts`
- Create: `apps/web/lib/llm/providers/openai-compatible.test.ts`

**Step 1: Test provider registry**

Create `apps/web/lib/llm/registry.test.ts`:

```typescript
import { describe, test, expect, beforeEach } from 'bun:test'
import {
  ProviderRegistry,
  getGlobalRegistry,
  resetGlobalRegistry,
} from './registry'
import type { ProviderConfig } from './types'

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry

  beforeEach(() => {
    resetGlobalRegistry()
    registry = getGlobalRegistry()
  })

  test('creates OpenAI provider', () => {
    const config: ProviderConfig = {
      provider: 'openai',
      auth: { apiKey: 'test-key' },
    }
    const provider = registry.createProvider('openai', config)
    expect(provider).toBeDefined()
    expect(registry.getProvider('openai')).toBe(provider)
  })

  test('sets default provider', () => {
    const config: ProviderConfig = {
      provider: 'openai',
      auth: { apiKey: 'test-key' },
    }
    registry.createProvider('provider1', config, true)
    registry.createProvider('provider2', config)

    expect(registry.getDefaultProvider()).toBe(
      registry.getProvider('provider1')
    )
  })

  test('lists all providers', () => {
    const config: ProviderConfig = {
      provider: 'openai',
      auth: { apiKey: 'test-key' },
    }
    registry.createProvider('p1', config)
    registry.createProvider('p2', config)

    const list = registry.listProviders()
    expect(list).toHaveLength(2)
    expect(list.map((p) => p.id)).toContain('p1')
    expect(list.map((p) => p.id)).toContain('p2')
  })

  test('removes provider', () => {
    const config: ProviderConfig = {
      provider: 'openai',
      auth: { apiKey: 'test-key' },
    }
    registry.createProvider('to-remove', config)
    expect(registry.getProvider('to-remove')).toBeDefined()

    registry.removeProvider('to-remove')
    expect(registry.getProvider('to-remove')).toBeUndefined()
  })

  test('throws for unsupported provider type', () => {
    const config = {
      provider: 'unsupported' as any,
      auth: { apiKey: 'test-key' },
    }
    expect(() => registry.createProvider('test', config)).toThrow(
      'Unsupported provider type'
    )
  })
})

describe('createProviderFromEnv', () => {
  test('creates provider from OPENAI_API_KEY', () => {
    process.env.OPENAI_API_KEY = 'test-openai-key'
    resetGlobalRegistry()

    const registry = getGlobalRegistry()
    const provider = registry.createProvider(
      'openai',
      {
        provider: 'openai',
        auth: { apiKey: process.env.OPENAI_API_KEY },
      },
      true
    )

    expect(provider).toBeDefined()
    delete process.env.OPENAI_API_KEY
  })
})
```

**Step 2: Test OpenAI compatible provider**

Create `apps/web/lib/llm/providers/openai-compatible.test.ts`:

```typescript
import { describe, test, expect, mock, beforeEach } from 'bun:test'
import { OpenAICompatibleProvider } from './openai-compatible'
import type { ProviderConfig } from '../types'

describe('OpenAICompatibleProvider', () => {
  let provider: OpenAICompatibleProvider
  let config: ProviderConfig

  beforeEach(() => {
    config = {
      provider: 'openai',
      auth: {
        apiKey: 'test-api-key',
        baseUrl: 'https://api.test.com/v1',
      },
      defaultModel: 'gpt-4',
    }
    provider = new OpenAICompatibleProvider(config)
  })

  test('initializes with correct config', () => {
    expect(provider).toBeDefined()
  })

  test('returns default model', () => {
    expect(provider.getDefaultModel()).toBe('gpt-4')
  })

  test('completions method exists', () => {
    expect(typeof provider.completions).toBe('function')
  })

  test('streaming method exists', () => {
    expect(typeof provider.stream).toBe('function')
  })
})
```

**Step 3: Commit**

```bash
git add apps/web/lib/llm/registry.test.ts
git add apps/web/lib/llm/providers/openai-compatible.test.ts
git commit -m "test: add tests for LLM provider registry and implementations"
```

---

## Phase 3: Convex Function Tests

### Task 6: Test Convex Projects Functions

**Files:**

- Create: `convex/projects.test.ts`
- Create: `convex/lib/test-helpers.ts`

**Step 1: Create Convex test helpers**

Create `convex/lib/test-helpers.ts`:

```typescript
import type { QueryCtx, MutationCtx } from '../_generated/server'
import type { DataModel } from '../_generated/dataModel'

export function createMockQueryCtx(overrides?: Partial<QueryCtx>): QueryCtx {
  const data = new Map<string, any[]>()
  let idCounter = 0

  return {
    db: {
      get: async (id: string) => {
        const [table] = id.split('-')
        const docs = data.get(table) || []
        return docs.find((d) => d._id === id) || null
      },
      query: (tableName: string) => ({
        collect: async () => data.get(tableName) || [],
        first: async () => (data.get(tableName) || [])[0] || null,
        filter: (q: any) => ({
          collect: async () => data.get(tableName) || [],
        }),
        order: () => ({
          collect: async () => data.get(tableName) || [],
        }),
        take: async (n: number) => (data.get(tableName) || []).slice(0, n),
      }),
      insert: async (table: string, doc: any) => {
        const id = `${table}-${++idCounter}`
        if (!data.has(table)) data.set(table, [])
        data.get(table)!.push({ _id: id, ...doc })
        return id
      },
      patch: async (id: string, updates: any) => {
        const [table] = id.split('-')
        const docs = data.get(table) || []
        const doc = docs.find((d) => d._id === id)
        if (doc) Object.assign(doc, updates)
      },
      delete: async (id: string) => {
        const [table] = id.split('-')
        const docs = data.get(table) || []
        const index = docs.findIndex((d) => d._id === id)
        if (index > -1) docs.splice(index, 1)
      },
      normalizeId: (table: string, id: string) =>
        id.startsWith(table) ? id : null,
    },
    auth: {
      getUserId: async () => 'users-1', // Mock authenticated user
    },
    ...overrides,
  } as any
}

export function createMockMutationCtx(
  overrides?: Partial<MutationCtx>
): MutationCtx {
  return createMockQueryCtx(overrides) as any
}
```

**Step 2: Test projects functions**

Create `convex/projects.test.ts`:

```typescript
import { describe, test, expect, beforeEach } from 'bun:test'
import { list, get, create, update, remove } from './projects'
import { createMockQueryCtx, createMockMutationCtx } from './lib/test-helpers'

describe('projects queries', () => {
  let ctx: ReturnType<typeof createMockQueryCtx>

  beforeEach(() => {
    ctx = createMockQueryCtx()
  })

  describe('list', () => {
    test('returns empty array when no projects', async () => {
      const result = await list(ctx, {})
      expect(result).toEqual([])
    })

    test('returns projects for current user', async () => {
      // Create test projects
      const userId = 'users-1'
      const projectId = await ctx.db.insert('projects', {
        name: 'Test Project',
        createdBy: userId,
        createdAt: Date.now(),
        lastOpenedAt: Date.now(),
      })

      const result = await list(ctx, {})
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test Project')
    })

    test('returns empty array when not authenticated', async () => {
      ctx.auth.getUserId = async () => null
      const result = await list(ctx, {})
      expect(result).toEqual([])
    })
  })

  describe('get', () => {
    test('returns project by id', async () => {
      const userId = 'users-1'
      const projectId = await ctx.db.insert('projects', {
        name: 'Test Project',
        createdBy: userId,
        createdAt: Date.now(),
        lastOpenedAt: Date.now(),
      })

      const result = await get(ctx, { id: projectId })
      expect(result).toBeDefined()
      expect(result!.name).toBe('Test Project')
    })

    test('returns null for non-existent project', async () => {
      const result = await get(ctx, { id: 'projects-nonexistent' })
      expect(result).toBeNull()
    })

    test('returns null when user does not own project', async () => {
      const otherUserId = 'users-2'
      const projectId = await ctx.db.insert('projects', {
        name: 'Other User Project',
        createdBy: otherUserId,
        createdAt: Date.now(),
        lastOpenedAt: Date.now(),
      })

      const result = await get(ctx, { id: projectId })
      expect(result).toBeNull()
    })
  })
})

describe('projects mutations', () => {
  let ctx: ReturnType<typeof createMockMutationCtx>

  beforeEach(() => {
    ctx = createMockMutationCtx()
  })

  describe('create', () => {
    test('creates project with required fields', async () => {
      const result = await create(ctx, {
        name: 'New Project',
        description: 'Test description',
      })

      expect(result).toBeDefined()
      const project = await ctx.db.get('projects', result)
      expect(project.name).toBe('New Project')
      expect(project.description).toBe('Test description')
      expect(project.createdBy).toBe('users-1')
    })

    test('throws when not authenticated', async () => {
      ctx.auth.getUserId = async () => null

      await expect(create(ctx, { name: 'New Project' })).rejects.toThrow(
        'Unauthorized'
      )
    })
  })

  describe('update', () => {
    test('updates project name', async () => {
      const userId = 'users-1'
      const projectId = await ctx.db.insert('projects', {
        name: 'Old Name',
        createdBy: userId,
        createdAt: Date.now(),
        lastOpenedAt: Date.now(),
      })

      await update(ctx, {
        id: projectId,
        name: 'New Name',
      })

      const project = await ctx.db.get('projects', projectId)
      expect(project.name).toBe('New Name')
    })

    test('throws when user does not own project', async () => {
      const otherUserId = 'users-2'
      const projectId = await ctx.db.insert('projects', {
        name: 'Other Project',
        createdBy: otherUserId,
        createdAt: Date.now(),
        lastOpenedAt: Date.now(),
      })

      await expect(
        update(ctx, { id: projectId, name: 'New Name' })
      ).rejects.toThrow('Project not found or access denied')
    })
  })

  describe('remove', () => {
    test('deletes project and related data', async () => {
      const userId = 'users-1'
      const projectId = await ctx.db.insert('projects', {
        name: 'To Delete',
        createdBy: userId,
        createdAt: Date.now(),
        lastOpenedAt: Date.now(),
      })

      // Add related files
      await ctx.db.insert('files', {
        projectId,
        path: 'test.ts',
        content: 'test',
        updatedAt: Date.now(),
      })

      await remove(ctx, { id: projectId })

      const project = await ctx.db.get('projects', projectId)
      expect(project).toBeNull()
    })
  })
})
```

**Step 3: Commit**

```bash
git add convex/lib/test-helpers.ts convex/projects.test.ts
git commit -m "test(convex): add tests for projects functions"
```

---

### Task 7: Test Files and Settings Functions

**Files:**

- Create: `convex/files.test.ts`
- Create: `convex/settings.test.ts`
- Create: `convex/chats.test.ts`

**Step 1: Test files functions**

Create `convex/files.test.ts`:

```typescript
import { describe, test, expect, beforeEach } from 'bun:test'
import { list, get, upsert, remove } from './files'
import { createMockQueryCtx, createMockMutationCtx } from './lib/test-helpers'

describe('files queries', () => {
  let ctx: ReturnType<typeof createMockQueryCtx>
  let projectId: string

  beforeEach(async () => {
    ctx = createMockQueryCtx()
    projectId = await ctx.db.insert('projects', {
      name: 'Test Project',
      createdBy: 'users-1',
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
    })
  })

  describe('list', () => {
    test('returns all files for project', async () => {
      await ctx.db.insert('files', {
        projectId,
        path: 'file1.ts',
        content: 'content1',
        updatedAt: Date.now(),
      })
      await ctx.db.insert('files', {
        projectId,
        path: 'file2.ts',
        content: 'content2',
        updatedAt: Date.now(),
      })

      const result = await list(ctx, { projectId })
      expect(result).toHaveLength(2)
    })
  })

  describe('get', () => {
    test('returns file by id', async () => {
      const fileId = await ctx.db.insert('files', {
        projectId,
        path: 'test.ts',
        content: 'test content',
        updatedAt: Date.now(),
      })

      const result = await get(ctx, { id: fileId })
      expect(result).toBeDefined()
      expect(result!.path).toBe('test.ts')
    })
  })
})

describe('files mutations', () => {
  let ctx: ReturnType<typeof createMockMutationCtx>
  let projectId: string

  beforeEach(async () => {
    ctx = createMockMutationCtx()
    projectId = await ctx.db.insert('projects', {
      name: 'Test Project',
      createdBy: 'users-1',
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
    })
  })

  describe('upsert', () => {
    test('creates new file', async () => {
      const fileId = await upsert(ctx, {
        projectId,
        path: 'new.ts',
        content: 'new content',
        isBinary: false,
      })

      const file = await ctx.db.get('files', fileId)
      expect(file.path).toBe('new.ts')
      expect(file.content).toBe('new content')
    })

    test('updates existing file', async () => {
      const fileId = await ctx.db.insert('files', {
        projectId,
        path: 'existing.ts',
        content: 'old content',
        updatedAt: Date.now(),
      })

      await upsert(ctx, {
        id: fileId,
        projectId,
        path: 'existing.ts',
        content: 'new content',
      })

      const file = await ctx.db.get('files', fileId)
      expect(file.content).toBe('new content')
    })
  })

  describe('remove', () => {
    test('deletes file', async () => {
      const fileId = await ctx.db.insert('files', {
        projectId,
        path: 'to-delete.ts',
        content: 'content',
        updatedAt: Date.now(),
      })

      await remove(ctx, { id: fileId })

      const file = await ctx.db.get('files', fileId)
      expect(file).toBeNull()
    })
  })
})
```

**Step 2: Create settings and chats tests**

Create similar test files for `convex/settings.test.ts` and
`convex/chats.test.ts` following the same pattern.

**Step 3: Commit**

```bash
git add convex/files.test.ts convex/settings.test.ts convex/chats.test.ts
git commit -m "test(convex): add tests for files, settings, and chats functions"
```

---

## Phase 4: UI Component Tests

### Task 8: Test UI Components

**Files:**

- Create: `apps/web/components/ui/button.test.tsx`
- Create: `apps/web/components/ui/input.test.tsx`
- Create: `apps/web/components/ui/dialog.test.tsx`
- Create: `apps/web/components/chat/ChatInput.test.tsx`

**Step 1: Test Button component**

Create `apps/web/components/ui/button.test.tsx`:

```typescript
import { describe, test, expect, mock } from 'bun:test'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  test('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  test('handles click events', () => {
    const handleClick = mock(() => {})
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  test('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByText('Disabled')).toBeDisabled()
  })

  test('applies variant classes', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>)
    expect(container.firstChild).toHaveClass('bg-destructive')
  })

  test('applies size classes', () => {
    const { container } = render(<Button size="sm">Small</Button>)
    expect(container.firstChild).toHaveClass('h-8')
  })
})
```

**Step 2: Test Input component**

Create `apps/web/components/ui/input.test.tsx`:

```typescript
import { describe, test, expect } from 'bun:test'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from './input'

describe('Input', () => {
  test('renders input with placeholder', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  test('handles value changes', () => {
    const handleChange = mock(() => {})
    render(<Input onChange={handleChange} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(handleChange).toHaveBeenCalled()
  })

  test('applies custom className', () => {
    const { container } = render(<Input className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  test('is disabled when disabled prop is true', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})
```

**Step 3: Test Dialog component**

Create `apps/web/components/ui/dialog.test.tsx`:

```typescript
import { describe, test, expect } from 'bun:test'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog'

describe('Dialog', () => {
  test('renders dialog trigger', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog Description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByText('Open Dialog')).toBeInTheDocument()
  })

  test('opens dialog when trigger is clicked', () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    fireEvent.click(screen.getByText('Open Dialog'))
    expect(screen.getByText('Dialog Title')).toBeInTheDocument()
  })
})
```

**Step 4: Test ChatInput component**

Create `apps/web/components/chat/ChatInput.test.tsx`:

```typescript
import { describe, test, expect, mock } from 'bun:test'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInput } from './ChatInput'

describe('ChatInput', () => {
  const defaultProps = {
    mode: 'discuss' as const,
    onModeChange: mock(() => {}),
    onSendMessage: mock(() => {}),
    isStreaming: false,
    onStopStreaming: mock(() => {}),
  }

  test('renders input field', () => {
    render(<ChatInput {...defaultProps} />)
    expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument()
  })

  test('sends message on submit', () => {
    const onSendMessage = mock(() => {})
    render(<ChatInput {...defaultProps} onSendMessage={onSendMessage} />)

    const input = screen.getByPlaceholderText(/Type your message/i)
    fireEvent.change(input, { target: { value: 'Hello' } })
    fireEvent.submit(input.closest('form')!)

    expect(onSendMessage).toHaveBeenCalledWith('Hello', 'discuss')
  })

  test('toggles mode', () => {
    const onModeChange = mock(() => {})
    render(<ChatInput {...defaultProps} onModeChange={onModeChange} />)

    const buildButton = screen.getByText(/Build/i)
    fireEvent.click(buildButton)

    expect(onModeChange).toHaveBeenCalledWith('build')
  })

  test('shows stop button when streaming', () => {
    render(<ChatInput {...defaultProps} isStreaming={true} />)
    expect(screen.getByText(/Stop/i)).toBeInTheDocument()
  })
})
```

**Step 5: Commit**

```bash
git add apps/web/components/ui/button.test.tsx
git add apps/web/components/ui/input.test.tsx
git add apps/web/components/ui/dialog.test.tsx
git add apps/web/components/chat/ChatInput.test.tsx
git commit -m "test(ui): add component tests for UI elements"
```

---

## Phase 5: Hook and Store Tests

### Task 9: Test React Hooks

**Files:**

- Create: `apps/web/hooks/useAgent.test.ts`
- Create: `apps/web/stores/artifactStore.test.ts`
- Create: `apps/web/hooks/useJobs.test.ts`

**Step 1: Test artifact store**

Create `apps/web/stores/artifactStore.test.ts`:

```typescript
import { describe, test, expect, beforeEach } from 'bun:test'
import { useArtifactStore } from './artifactStore'

describe('ArtifactStore', () => {
  beforeEach(() => {
    // Reset store state
    useArtifactStore.setState({ artifacts: [] })
  })

  test('adds artifact to queue', () => {
    const store = useArtifactStore.getState()

    store.addToQueue({
      id: 'test-1',
      type: 'file_write',
      payload: { filePath: 'test.ts', content: 'test' },
      description: 'Test file',
    })

    expect(store.artifacts).toHaveLength(1)
    expect(store.artifacts[0].status).toBe('pending')
  })

  test('applies artifact', () => {
    const store = useArtifactStore.getState()

    store.addToQueue({
      id: 'test-1',
      type: 'file_write',
      payload: { filePath: 'test.ts', content: 'test' },
      description: 'Test file',
    })

    store.applyArtifact('test-1')
    expect(store.artifacts[0].status).toBe('applied')
  })

  test('rejects artifact', () => {
    const store = useArtifactStore.getState()

    store.addToQueue({
      id: 'test-1',
      type: 'file_write',
      payload: { filePath: 'test.ts', content: 'test' },
      description: 'Test file',
    })

    store.rejectArtifact('test-1')
    expect(store.artifacts[0].status).toBe('rejected')
  })

  test('clears queue', () => {
    const store = useArtifactStore.getState()

    store.addToQueue({
      id: 'test-1',
      type: 'file_write',
      payload: { filePath: 'test.ts', content: 'test' },
      description: 'Test file',
    })

    store.clearQueue()
    expect(store.artifacts).toHaveLength(0)
  })

  test('gets pending artifacts', () => {
    const store = useArtifactStore.getState()

    store.addToQueue({
      id: 'test-1',
      type: 'file_write',
      payload: { filePath: 'test.ts', content: 'test' },
      description: 'Test file 1',
    })
    store.addToQueue({
      id: 'test-2',
      type: 'file_write',
      payload: { filePath: 'test2.ts', content: 'test' },
      description: 'Test file 2',
    })
    store.applyArtifact('test-1')

    const pending = store.getPending()
    expect(pending).toHaveLength(1)
    expect(pending[0].id).toBe('test-2')
  })

  test('applies all pending artifacts', () => {
    const store = useArtifactStore.getState()

    store.addToQueue({
      id: 'test-1',
      type: 'file_write',
      payload: { filePath: 'a.ts', content: '' },
      description: '',
    })
    store.addToQueue({
      id: 'test-2',
      type: 'file_write',
      payload: { filePath: 'b.ts', content: '' },
      description: '',
    })
    store.rejectArtifact('test-1')

    store.applyAll()
    expect(store.artifacts[1].status).toBe('applied')
  })
})
```

**Step 2: Create tests for other hooks**

Create `apps/web/hooks/useAgent.test.ts` and `apps/web/hooks/useJobs.test.ts`
with similar patterns.

**Step 3: Commit**

```bash
git add apps/web/stores/artifactStore.test.ts
git add apps/web/hooks/useAgent.test.ts
git add apps/web/hooks/useJobs.test.ts
git commit -m "test(hooks): add tests for hooks and stores"
```

---

## Phase 6: Integration Tests

### Task 10: Test Critical User Flows

**Files:**

- Create: `apps/web/e2e/project-creation.spec.ts`
- Create: `apps/web/e2e/file-operations.spec.ts`
- Create: `apps/web/e2e/chat-flow.spec.ts`

**Step 1: Test project creation flow**

Create `apps/web/e2e/project-creation.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Project Creation Flow', () => {
  test('user can create a new project', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/projects')

    // Click create project button
    await page.click('text=New Project')

    // Fill in project details
    await page.fill('input[name="name"]', 'Test Project')
    await page.fill('input[name="description"]', 'A test project')

    // Submit form
    await page.click('button[type="submit"]')

    // Verify project was created
    await expect(page.locator('text=Test Project')).toBeVisible()
  })

  test('user cannot create project without name', async ({ page }) => {
    await page.goto('/projects')
    await page.click('text=New Project')

    // Try to submit without name
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeDisabled()
  })
})
```

**Step 2: Test file operations**

Create `apps/web/e2e/file-operations.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('File Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Create a project first
    await page.goto('/projects')
    await page.click('text=New Project')
    await page.fill('input[name="name"]', 'File Test Project')
    await page.click('button[type="submit"]')

    // Navigate to project
    await page.click('text=File Test Project')
  })

  test('user can create a new file', async ({ page }) => {
    // Right-click in file explorer
    await page.click('[data-testid="file-explorer"]')
    await page.click('text=New File')

    // Enter file name
    await page.fill('input[placeholder="filename.ts"]', 'test.ts')
    await page.press('input[placeholder="filename.ts"]', 'Enter')

    // Verify file appears
    await expect(page.locator('text=test.ts')).toBeVisible()
  })

  test('user can edit file content', async ({ page }) => {
    // Select file
    await page.click('text=test.ts')

    // Type in editor
    await page.fill('[data-testid="editor"]', 'console.log("hello")')

    // Save file
    await page.keyboard.press('Control+s')

    // Verify save toast
    await expect(page.locator('text=Saved test.ts')).toBeVisible()
  })
})
```

**Step 3: Test chat flow**

Create `apps/web/e2e/chat-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: create project and navigate to it
    await page.goto('/projects')
    await page.click('text=New Project')
    await page.fill('input[name="name"]', 'Chat Test Project')
    await page.click('button[type="submit"]')
    await page.click('text=Chat Test Project')
  })

  test('user can send a message', async ({ page }) => {
    // Type message
    await page.fill('[data-testid="chat-input"]', 'Hello AI')

    // Send message
    await page.click('text=Send')

    // Verify message appears
    await expect(page.locator('text=Hello AI')).toBeVisible()
  })

  test('user can toggle between discuss and build modes', async ({ page }) => {
    // Check initial mode (discuss)
    await expect(page.locator('[data-testid="mode-discuss"]')).toHaveClass(
      /active/
    )

    // Switch to build mode
    await page.click('text=Build')

    // Verify mode changed
    await expect(page.locator('[data-testid="mode-build"]')).toHaveClass(
      /active/
    )
  })
})
```

**Step 4: Commit**

```bash
git add apps/web/e2e/project-creation.spec.ts
git add apps/web/e2e/file-operations.spec.ts
git add apps/web/e2e/chat-flow.spec.ts
git commit -m "test(e2e): add integration tests for critical user flows"
```

---

## Phase 7: Coverage Validation

### Task 11: Generate Coverage Report

**Step 1: Run coverage report**

```bash
cd /home/nochaserz/Documents/Coding Projects/panda/apps/web
bun run test:coverage
```

**Step 2: Analyze coverage output**

Check coverage report in `coverage/index.html`:

- Overall coverage percentage
- Coverage by file
- Uncovered lines

**Step 3: Identify gaps**

Document uncovered areas:

- Which files have <50% coverage?
- Which critical paths are untested?
- What edge cases are missing?

**Step 4: Add tests for uncovered areas**

Create additional tests targeting uncovered code paths.

**Step 5: Commit**

```bash
git add .
git commit -m "test: add tests for uncovered code paths"
```

---

## Summary

This comprehensive testing plan provides:

1. **Testing Infrastructure**: Utilities, mocks, coverage configuration
2. **Unit Tests**: Core utilities (~50+ tests)
3. **Convex Tests**: Server-side functions (~40+ tests)
4. **Component Tests**: UI components (~30+ tests)
5. **Hook Tests**: React hooks and stores (~20+ tests)
6. **Integration Tests**: E2E critical flows (~15+ tests)

**Expected Test Count:** 150-200+ tests  
**Expected Timeline:** 2-3 weeks  
**Target Coverage:** 60-70% (Month 1), 80% (Month 3)

**Key Deliverables:**

- All critical code paths have tests
- Coverage reporting in CI/CD
- E2E tests for user journeys
- Testing documentation and patterns

---

## Post-Implementation Checklist

- [ ] All new tests passing
- [ ] Coverage report generated
- [ ] Coverage threshold met (60%+)
- [ ] CI/CD updated to run tests
- [ ] E2E tests passing
- [ ] Test documentation written
- [ ] Team trained on testing patterns
