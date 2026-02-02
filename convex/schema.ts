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
    avatarUrl: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_email', ['email'])
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
    messageId: v.id('messages'),
    actions: v.array(v.record(v.string(), v.any())),
    status: v.union(
      v.literal('pending'),
      v.literal('in_progress'),
      v.literal('completed'),
      v.literal('failed')
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
})
