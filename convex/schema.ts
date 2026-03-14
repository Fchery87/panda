import { defineSchema, defineTable } from 'convex/server'
import { authTables } from '@convex-dev/auth/server'
import { v } from 'convex/values'

/**
 * Chat mode type - used across the application
 * - ask: Read-only Q&A
 * - architect: System design, limited edits
 * - code: Default coding mode
 * - build: Full implementation
 */
export const ChatMode = v.union(
  v.literal('ask'),
  v.literal('architect'),
  v.literal('code'),
  v.literal('build'),
  v.literal('discuss'),
  v.literal('debug'),
  v.literal('review')
)

export type ChatModeType = 'ask' | 'architect' | 'code' | 'build'

export const PlanStatus = v.union(
  v.literal('idle'),
  v.literal('drafting'),
  v.literal('awaiting_review'),
  v.literal('approved'),
  v.literal('stale'),
  v.literal('executing')
)

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
    // Admin fields
    isAdmin: v.optional(v.boolean()),
    adminRole: v.optional(v.union(v.literal('super'), v.literal('admin'), v.literal('moderator'))),
    adminGrantedAt: v.optional(v.number()),
    adminGrantedBy: v.optional(v.id('users')),
    // User status
    isBanned: v.optional(v.boolean()),
    bannedAt: v.optional(v.number()),
    bannedReason: v.optional(v.string()),
  })
    // Required by @convex-dev/auth internals (looks up users via withIndex("email")).
    .index('email', ['email'])
    .index('phone', ['phone'])
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_admin', ['isAdmin'])
    .index('by_banned', ['isBanned']),

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
    mode: ChatMode,
    planDraft: v.optional(v.string()),
    planStatus: v.optional(PlanStatus),
    planSourceMessageId: v.optional(v.string()),
    planApprovedAt: v.optional(v.number()),
    planLastGeneratedAt: v.optional(v.number()),
    planBuildRunId: v.optional(v.id('agentRuns')),
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
    permissions: v.optional(
      v.object({
        tools: v.optional(v.record(v.string(), v.string())),
        bash: v.optional(v.record(v.string(), v.string())),
      })
    ),
    // Admin override tracking
    overrideGlobalProvider: v.optional(v.boolean()),
    overrideGlobalModel: v.optional(v.boolean()),
    overrideProviderConfigs: v.optional(v.record(v.string(), v.boolean())),
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
    mode: ChatMode,
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
    progressCategory: v.optional(v.string()),
    progressToolName: v.optional(v.string()),
    progressHasArtifactTarget: v.optional(v.boolean()),
    targetFilePaths: v.optional(v.array(v.string())),
    toolCallId: v.optional(v.string()),
    toolName: v.optional(v.string()),
    args: v.optional(v.record(v.string(), v.any())),
    output: v.optional(v.string()),
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    planStepIndex: v.optional(v.number()),
    planStepTitle: v.optional(v.string()),
    planTotalSteps: v.optional(v.number()),
    completedPlanStepIndexes: v.optional(v.array(v.number())),
    usage: v.optional(v.record(v.string(), v.any())),
    snapshot: v.optional(
      v.object({
        hash: v.string(),
        step: v.number(),
        files: v.array(v.string()),
        timestamp: v.number(),
      })
    ),
    createdAt: v.number(),
  })
    .index('by_run_sequence', ['runId', 'sequence'])
    .index('by_chat_created', ['chatId', 'createdAt']),

  // 11a. SessionSummaries table - structured session handoff summaries
  sessionSummaries: defineTable({
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    summary: v.string(),
    structured: v.optional(v.record(v.string(), v.any())),
    tokenCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_chat', ['chatId'])
    .index('by_project_created', ['projectId', 'createdAt']),

  // 12. Harness runtime checkpoints table - durable runtime resume snapshots
  harnessRuntimeCheckpoints: defineTable({
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    runId: v.optional(v.id('agentRuns')),
    sessionID: v.string(),
    version: v.number(),
    agentName: v.string(),
    reason: v.union(v.literal('step'), v.literal('complete'), v.literal('error')),
    savedAt: v.number(),
    checkpoint: v.any(),
  })
    .index('by_chat_session_saved', ['chatId', 'sessionID', 'savedAt'])
    .index('by_project_session_saved', ['projectId', 'sessionID', 'savedAt'])
    .index('by_run_session_saved', ['runId', 'sessionID', 'savedAt'])
    .index('by_chat_saved', ['chatId', 'savedAt'])
    .index('by_run_saved', ['runId', 'savedAt']),

  // 13. Checkpoints table - versioned snapshots for rollback
  checkpoints: defineTable({
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    name: v.string(),
    description: v.optional(v.string()),
    filesChanged: v.array(v.string()),
    snapshotIds: v.array(v.id('fileSnapshots')),
    createdAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_chat', ['chatId'])
    .index('by_project_created', ['projectId', 'createdAt']),

  // 14. Provider tokens table - OAuth tokens for LLM providers
  providerTokens: defineTable({
    userId: v.id('users'),
    provider: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_provider', ['userId', 'provider']),

  // 15. Shared chats table - public sharing links for chat sessions
  sharedChats: defineTable({
    chatId: v.id('chats'),
    shareId: v.string(),
    createdBy: v.id('users'),
    createdAt: v.number(),
    isPublic: v.boolean(),
  })
    .index('by_chat', ['chatId'])
    .index('by_shareId', ['shareId'])
    .index('by_creator', ['createdBy']),

  // 16. MCP Servers table - user-configured MCP servers
  mcpServers: defineTable({
    userId: v.id('users'),
    name: v.string(),
    transport: v.union(v.literal('stdio'), v.literal('sse')),
    command: v.optional(v.string()),
    args: v.optional(v.array(v.string())),
    url: v.optional(v.string()),
    enabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_name', ['userId', 'name']),

  // 17. Custom Subagents table - user-defined subagents
  subagents: defineTable({
    userId: v.id('users'),
    name: v.string(),
    description: v.string(),
    prompt: v.optional(v.string()),
    model: v.optional(v.string()),
    temperature: v.optional(v.number()),
    maxSteps: v.optional(v.number()),
    permissions: v.optional(
      v.object({
        tools: v.optional(v.record(v.string(), v.string())),
        bash: v.optional(v.record(v.string(), v.string())),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_name', ['userId', 'name']),

  // 18. Admin Settings table - global system configuration
  adminSettings: defineTable({
    // Global LLM Configuration
    globalDefaultProvider: v.optional(v.string()),
    globalDefaultModel: v.optional(v.string()),
    globalProviderConfigs: v.optional(v.record(v.string(), v.record(v.string(), v.any()))),

    // Prompt Enhancement LLM Configuration
    enhancementProvider: v.optional(v.string()),
    enhancementModel: v.optional(v.string()),

    // Feature flags
    allowUserOverrides: v.optional(v.boolean()),
    allowUserMCP: v.optional(v.boolean()),
    allowUserSubagents: v.optional(v.boolean()),

    // System controls
    systemMaintenance: v.optional(v.boolean()),
    registrationEnabled: v.optional(v.boolean()),
    maxProjectsPerUser: v.optional(v.number()),
    maxChatsPerProject: v.optional(v.number()),

    // Analytics tracking
    trackUsageAnalytics: v.optional(v.boolean()),
    trackProviderUsage: v.optional(v.boolean()),

    // Updated timestamp
    updatedAt: v.number(),
    updatedBy: v.optional(v.id('users')),
  }).index('by_updated', ['updatedAt']),

  // 18. User Analytics table - per-user usage tracking
  userAnalytics: defineTable({
    userId: v.id('users'),
    totalChats: v.optional(v.number()),
    totalMessages: v.optional(v.number()),
    totalProjects: v.optional(v.number()),
    totalTokensUsed: v.optional(v.number()),
    lastActiveAt: v.optional(v.number()),
    providerUsage: v.optional(v.record(v.string(), v.number())),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_last_active', ['lastActiveAt']),

  // 19. Audit Log table - administrative actions
  auditLog: defineTable({
    userId: v.optional(v.id('users')),
    action: v.string(),
    resource: v.string(),
    resourceId: v.optional(v.string()),
    details: v.optional(v.record(v.string(), v.any())),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_action', ['action'])
    .index('by_created', ['createdAt'])
    .index('by_resource', ['resource', 'resourceId']),

  // 20. Sessions table - agentic harness sessions
  agentSessions: defineTable({
    projectId: v.id('projects'),
    parentSessionId: v.optional(v.id('agentSessions')),
    status: v.union(v.literal('idle'), v.literal('busy'), v.literal('waiting'), v.literal('error')),
    agent: v.string(),
    model: v.optional(
      v.object({
        providerId: v.string(),
        modelId: v.string(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    compactionCount: v.optional(v.number()),
  })
    .index('by_project', ['projectId'])
    .index('by_parent', ['parentSessionId'])
    .index('by_status', ['projectId', 'status']),

  // 21. Message Parts table - structured parts for agentic messages
  messageParts: defineTable({
    sessionId: v.id('agentSessions'),
    messageId: v.id('messages'),
    partType: v.union(
      v.literal('text'),
      v.literal('reasoning'),
      v.literal('file'),
      v.literal('tool'),
      v.literal('subtask'),
      v.literal('agent'),
      v.literal('step_start'),
      v.literal('step_finish'),
      v.literal('snapshot'),
      v.literal('patch'),
      v.literal('retry'),
      v.literal('compaction'),
      v.literal('permission')
    ),
    data: v.record(v.string(), v.any()),
    sequence: v.number(),
    createdAt: v.number(),
  })
    .index('by_session', ['sessionId'])
    .index('by_message', ['messageId'])
    .index('by_session_sequence', ['sessionId', 'sequence']),

  // 22. Permission Requests table - pending permission requests
  permissionRequests: defineTable({
    sessionId: v.id('agentSessions'),
    messageId: v.id('messages'),
    tool: v.string(),
    pattern: v.string(),
    metadata: v.optional(v.record(v.string(), v.any())),
    decision: v.optional(v.union(v.literal('allow'), v.literal('deny'), v.literal('ask'))),
    reason: v.optional(v.string()),
    createdAt: v.number(),
    decidedAt: v.optional(v.number()),
  })
    .index('by_session', ['sessionId'])
    .index('by_decision', ['sessionId', 'decision']),

  // 23. Snapshots table - git snapshots for undo
  gitSnapshots: defineTable({
    sessionId: v.id('agentSessions'),
    messageId: v.id('messages'),
    hash: v.string(),
    step: v.number(),
    files: v.array(v.string()),
    createdAt: v.number(),
  })
    .index('by_session', ['sessionId'])
    .index('by_hash', ['hash'])
    .index('by_session_step', ['sessionId', 'step']),

  // 24. Eval Suites table - reusable agent eval scenario collections
  evalSuites: defineTable({
    projectId: v.id('projects'),
    userId: v.id('users'),
    chatId: v.optional(v.id('chats')),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal('draft'), v.literal('active'), v.literal('archived')),
    scenarios: v.array(v.any()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastRunAt: v.optional(v.number()),
  })
    .index('by_project_updated', ['projectId', 'updatedAt'])
    .index('by_project_status', ['projectId', 'status'])
    .index('by_chat_updated', ['chatId', 'updatedAt']),

  // 25. Eval Runs table - execution attempts for a suite
  evalRuns: defineTable({
    projectId: v.id('projects'),
    suiteId: v.id('evalSuites'),
    userId: v.id('users'),
    chatId: v.optional(v.id('chats')),
    status: v.union(
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('cancelled')
    ),
    runner: v.string(),
    mode: v.optional(v.union(v.literal('read_only'), v.literal('full'))),
    policy: v.optional(v.any()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    summary: v.optional(v.string()),
    scorecard: v.optional(v.any()),
  })
    .index('by_suite_started', ['suiteId', 'startedAt'])
    .index('by_project_started', ['projectId', 'startedAt'])
    .index('by_project_status', ['projectId', 'status']),

  // 26. Eval Run Results table - per-scenario results for an eval run
  evalRunResults: defineTable({
    runId: v.id('evalRuns'),
    suiteId: v.id('evalSuites'),
    projectId: v.id('projects'),
    scenarioId: v.string(),
    scenarioName: v.string(),
    sequence: v.number(),
    status: v.union(v.literal('passed'), v.literal('failed'), v.literal('error')),
    score: v.number(),
    input: v.any(),
    expected: v.optional(v.any()),
    output: v.optional(v.any()),
    reason: v.optional(v.string()),
    error: v.optional(v.string()),
    tags: v.array(v.string()),
    durationMs: v.number(),
    metadata: v.optional(v.record(v.string(), v.any())),
    createdAt: v.number(),
  })
    .index('by_run_sequence', ['runId', 'sequence'])
    .index('by_suite_created', ['suiteId', 'createdAt'])
    .index('by_project_created', ['projectId', 'createdAt']),

  // 27. Specifications table - SpecNative formal specifications
  specifications: defineTable({
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    runId: v.optional(v.id('agentRuns')),
    version: v.number(),
    tier: v.union(v.literal('instant'), v.literal('ambient'), v.literal('explicit')),
    status: v.union(
      v.literal('draft'),
      v.literal('validated'),
      v.literal('approved'),
      v.literal('executing'),
      v.literal('verified'),
      v.literal('drifted'),
      v.literal('failed'),
      v.literal('archived')
    ),
    intent: v.object({
      goal: v.string(),
      rawMessage: v.string(),
      constraints: v.array(v.any()),
      acceptanceCriteria: v.array(v.any()),
    }),
    plan: v.object({
      steps: v.array(v.any()),
      dependencies: v.array(v.any()),
      risks: v.array(v.any()),
      estimatedTools: v.array(v.string()),
    }),
    validation: v.object({
      preConditions: v.array(v.any()),
      postConditions: v.array(v.any()),
      invariants: v.array(v.any()),
    }),
    provenance: v.object({
      model: v.string(),
      promptHash: v.string(),
      timestamp: v.number(),
      parentSpecId: v.optional(v.string()),
    }),
    verificationResults: v.optional(v.array(v.any())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_chat', ['chatId'])
    .index('by_run', ['runId'])
    .index('by_status', ['projectId', 'status'])
    .index('by_tier', ['projectId', 'tier']),
})
