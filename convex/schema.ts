import { defineSchema, defineTable } from 'convex/server'
import { authTables } from '@convex-dev/auth/server'
import { v } from 'convex/values'

export default defineSchema({
  // Auth tables (accounts, sessions, verification codes, etc.)
  ...authTables,

  // 1. Users table - authenticated users
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    avatarUrl: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    // Required by @convex-dev/auth internals (looks up users via withIndex("email")).
    .index('email', ['email'])
    .index('phone', ['phone'])
    .index('by_tokenIdentifier', ['tokenIdentifier']),

  // 2. Projects table - code projects
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id('users'),
    createdAt: v.number(),
    lastOpenedAt: v.optional(v.number()),
    repoUrl: v.optional(v.string()),
    agentPolicy: v.optional(
      v.union(
        v.null(),
        v.object({
          autoApplyFiles: v.boolean(),
          autoRunCommands: v.boolean(),
          allowedCommandPrefixes: v.array(v.string()),
        })
      )
    ),
  })
    .index('by_creator', ['createdBy'])
    .index('by_last_opened', ['createdBy', 'lastOpenedAt']),

  // 3. Files table - project files with content
  files: defineTable({
    projectId: v.id('projects'),
    path: v.string(),
    content: v.optional(v.string()),
    isBinary: v.optional(v.boolean()),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_path', ['projectId', 'path'])
    .index('by_updated', ['projectId', 'updatedAt']),

  // 4. FileSnapshots table - versioned file content for diff/restore
  fileSnapshots: defineTable({
    fileId: v.id('files'),
    snapshotNumber: v.number(),
    content: v.string(),
    createdAt: v.number(),
  })
    .index('by_file', ['fileId'])
    .index('by_snapshot', ['fileId', 'snapshotNumber']),

  // 5. Chats table - conversation threads per project
  chats: defineTable({
    projectId: v.id('projects'),
    title: v.optional(v.string()),
    mode: v.union(v.literal('discuss'), v.literal('build')),
    planDraft: v.optional(v.string()),
    planUpdatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_updated', ['projectId', 'updatedAt']),

  // 6. Messages table - chat messages
  messages: defineTable({
    chatId: v.id('chats'),
    role: v.union(v.literal('user'), v.literal('assistant'), v.literal('system')),
    content: v.string(),
    annotations: v.optional(v.array(v.record(v.string(), v.any()))),
    createdAt: v.number(),
  })
    .index('by_chat', ['chatId'])
    .index('by_created', ['chatId', 'createdAt']),

  // 7. Artifacts table - AI-generated artifacts from chats
  artifacts: defineTable({
    chatId: v.id('chats'),
    messageId: v.optional(v.id('messages')),
    actions: v.array(v.record(v.string(), v.any())),
    status: v.union(
      v.literal('pending'),
      v.literal('in_progress'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('rejected')
    ),
    createdAt: v.number(),
  })
    .index('by_chat', ['chatId'])
    .index('by_message', ['messageId'])
    .index('by_status', ['chatId', 'status']),

  // 8. Settings table - user preferences and provider configs
  settings: defineTable({
    userId: v.id('users'),
    providerConfigs: v.optional(v.record(v.string(), v.record(v.string(), v.any()))),
    theme: v.union(v.literal('light'), v.literal('dark'), v.literal('system')),
    language: v.optional(v.string()),
    defaultProvider: v.optional(v.string()),
    defaultModel: v.optional(v.string()),
    agentDefaults: v.optional(
      v.union(
        v.null(),
        v.object({
          autoApplyFiles: v.boolean(),
          autoRunCommands: v.boolean(),
          allowedCommandPrefixes: v.array(v.string()),
        })
      )
    ),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  // 9. Jobs table - background task execution (CLI commands, etc.)
  jobs: defineTable({
    projectId: v.id('projects'),
    type: v.union(
      v.literal('cli'),
      v.literal('build'),
      v.literal('test'),
      v.literal('deploy'),
      v.literal('lint'),
      v.literal('format')
    ),
    status: v.union(
      v.literal('queued'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('cancelled')
    ),
    command: v.string(),
    logs: v.optional(v.array(v.string())),
    output: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index('by_project', ['projectId'])
    .index('by_status', ['status'])
    .index('by_project_status', ['projectId', 'status'])
    .index('by_created', ['projectId', 'createdAt']),

  // 10. AgentRuns table - canonical run lifecycle per chat turn
  agentRuns: defineTable({
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    userId: v.id('users'),
    mode: v.union(v.literal('discuss'), v.literal('build')),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    status: v.union(
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('stopped')
    ),
    userMessage: v.optional(v.string()),
    summary: v.optional(v.string()),
    error: v.optional(v.string()),
    usage: v.optional(v.record(v.string(), v.any())),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_chat_started', ['chatId', 'startedAt'])
    .index('by_project_started', ['projectId', 'startedAt'])
    .index('by_user_started', ['userId', 'startedAt']),

  // 11. AgentRunEvents table - persisted timeline events for each run
  agentRunEvents: defineTable({
    runId: v.id('agentRuns'),
    chatId: v.id('chats'),
    sequence: v.number(),
    type: v.string(),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
    toolCallId: v.optional(v.string()),
    toolName: v.optional(v.string()),
    args: v.optional(v.record(v.string(), v.any())),
    output: v.optional(v.string()),
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    usage: v.optional(v.record(v.string(), v.any())),
    createdAt: v.number(),
  })
    .index('by_run_sequence', ['runId', 'sequence'])
    .index('by_chat_created', ['chatId', 'createdAt']),
})
