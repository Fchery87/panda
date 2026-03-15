/**
 * Agentic Harness - OpenCode-style agent system for Panda.ai
 *
 * Provider-agnostic agentic harness with:
 * - Multi-step reasoning with tool execution
 * - Subagent delegation for specialized tasks
 * - Context compaction for long conversations
 * - Permission-aware tool execution
 * - Plugin system for extensibility
 * - Real-time event streaming
 * - MCP (Model Context Protocol) support
 * - Git snapshot/undo capability
 */

export type {
  Identifier,
  AgentMode,
  PermissionDecision,
  Permission,
  ToolRiskTier,
  ToolInterruptRequest,
  ToolInterruptResult,
  FinishReason,
  AgentConfig,
  ToolState,
  BasePart,
  TextPart,
  ReasoningPart,
  FileSource,
  FilePart,
  ToolPart,
  SubtaskPart,
  AgentPart,
  StepStartPart,
  StepFinishPart,
  SnapshotPart,
  PatchPart,
  RetryPart,
  CompactionPart,
  PermissionPart,
  Part,
  UserMessage,
  APIError,
  AssistantMessage,
  Message,
  SessionState,
  RuntimeConfig,
  HookContext,
  HookType,
  HookHandler,
  Plugin,
  EventType,
  Event,
  EventHandler,
  SubagentTask,
  SubagentResult,
  CompactionResult,
  PermissionRequest,
  PermissionResult,
} from './types'

export { ascending, random, parseTimestamp, compare } from './identifier'
export { bus } from './event-bus'
export { permissions, checkPermission, mergePermissions, DEFAULT_PERMISSIONS } from './permissions'
export { agents, parseAgentMarkdown, BUILTIN_AGENTS, SUBAGENT_TEMPLATES } from './agents'
export {
  plugins,
  createPlugin,
  loggingPlugin,
  costTrackingPlugin,
  specTrackingPlugin,
  defaultPlugins,
  registerDefaultPlugins,
} from './plugins'
export {
  compaction,
  estimateTokens,
  estimateMessageTokens,
  estimatePartTokens,
  needsCompaction,
  pruneToolOutputs,
  filterCompacted,
  SUMMARIZATION_PROMPT,
} from './compaction'
export type { CompactionConfig } from './compaction'
export { Runtime, createRuntime } from './runtime'
export type { RuntimeEvent, RuntimeEventType, ToolExecutionContext, ToolExecutor } from './runtime'
export {
  TASK_TOOL_DEFINITION,
  QUESTION_TOOL_DEFINITION,
  executeTaskTool,
  executeQuestionTool,
  createSubtaskPart,
  getTaskToolDefinitions,
} from './task-tool'
export type { TaskToolContext } from './task-tool'
export { mcp } from './mcp'
export type { MCPServerConfig, MCPToolDefinition, MCPResource, MCPClient } from './mcp'
export { snapshots, diffSnapshots, createPatch } from './snapshots'
export type { Snapshot } from './snapshots'
export {
  runEvalSuite,
  buildEvalScorecard,
  exactMatchScorer,
  containsTextScorer,
  regexTextScorer,
  normalizedTextExactScorer,
} from './evals'
export type {
  EvalScenario,
  EvalRunnerOutput,
  EvalScore,
  EvalResult,
  EvalReport,
  EvalScorecard,
  EvalTagScorecard,
  RunEvalSuiteOptions,
} from './evals'
export { createEvalTemplateScenarios } from './eval-templates'
export type { EvalTemplate } from './eval-templates'
