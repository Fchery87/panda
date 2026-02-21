# Planning: Memory Bank Integration

This document outlines the architecture and implementation for the **Memory
Bank** system in Panda.ai. Inspired by established patterns in AI coding
assistants, the Memory Bank serves as a persistent, project-level knowledge
store that is injected into every agent conversation.

## Core Concept

The Memory Bank is designed to solve the "context amnesia" problem in
long-running projects. While the agent has access to the codebase, high-level
project knowledge (tech stack, coding conventions, architectural decisions, and
current progress) is often lost between chat turns.

**Key Features:**

- **Persistent Storage**: Stored in the project's Convex database as a special
  file (`MEMORY_BANK.md`).
- **Mode-Agnostic Injection**: Automatically appended to the system prompt
  across all agent modes (`ask`, `architect`, `code`, etc.).
- **User-Directable**: editable UI for users to refine or manually override
  project context.
- **Agent-Aware**: Tools for the agent to read and potentially update its own
  memory.

---

## Technical Architecture

### 1. Data Persistence

The Memory Bank is implemented as a "virtual" file within the existing `files`
table to maintain compatibility with existing project structures and search
tools.

- **Storage Path**: `MEMORY_BANK.md`
- **Backend**: `convex/memoryBank.ts` provides optimized `get` and `update`
  mutations.
- **Schema**: No new tables are required; it leverages the optimized indices on
  the `files` table.

### 2. Prompt Injection

Integration occurs at the `lib/agent/prompt-library.ts` layer.

```typescript
// PromptContext interface includes:
memoryBank?: string

// prompt-library.ts
if (context.memoryBank) {
  contextContent += `\n## Project Memory Bank\n${context.memoryBank}\n`
}
```

This ensures that the agent always "knows" where it is and what the project
rules are before it processes the first user message.

### 3. UI Implementation

A dedicated `MemoryBankEditor` component provides a focused interface for
context management.

- **Location**: sidebar or chat header.
- **Functionality**:
  - Live preview of character count.
  - Draft state with "Discard" and "Save" actions.
  - Active indicator when content is present.

---

## Proposed Roadmap & Enhancements

### Phase 1: Foundation (Current State)

- [x] Basic CRUD operations in Convex.
- [x] Prompt injection logic.
- [x] Basic UI editor.

### Phase 2: Workflow Integration

- [ ] **Auto-Summarization**: Add a tool for agents to "Summarize and Persist"
      architectural decisions to the Memory Bank after complex tasks.
- [ ] **Mode Awareness**: Tailor the memory injection based on mode (e.g., in
      `code` mode, prioritize "known issues" section of Memory Bank).
- [ ] **Template System**: Provide "Panda Standard" patterns for `.md` structure
      (System Architecture, Tech Stack, Progress, Root Rules).

### Phase 3: Advanced Context

- [ ] **Cross-Project Memory**: Allow shared memory blocks across different
      projects in a shared workspace.
- [ ] **Conflict Detection**: Alert the user if the agent's proposed plan
      conflicts with "Root Rules" defined in the Memory Bank.

---

## Success Metrics

- **Context Accuracy**: Reduced number of "I forgot you use X framework" errors.
- **User Efficiency**: Decreased manual repetition of coding standards in chat.
- **Onboarding Speed**: New chats in existing projects should feel immediately
  "aware" of the environment.
