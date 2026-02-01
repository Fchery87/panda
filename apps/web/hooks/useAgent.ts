/**
 * useAgent Hook
 *
 * Combines streaming chat with tool execution for AI agent functionality.
 * Manages agent runtime lifecycle, handles tool calls, and integrates
 * artifact queue with chat interface.
 *
 * @file apps/web/hooks/useAgent.ts
 */

'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useConvex } from 'convex/react';
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { LLMProvider } from '../lib/llm/types';
import {
  createAgentRuntime,
  createToolContext,
  type AgentEvent,
  type RuntimeConfig,
} from '../lib/agent';
import type { PromptContext } from '../lib/agent/prompt-library';
import {
  useArtifactStore,
  type ArtifactType,
  type FileWritePayload,
  type CommandRunPayload,
} from '../stores/artifactStore';
import { toast } from 'sonner';

/**
 * Chat mode type
 */
type ChatMode = 'discuss' | 'build';

/**
 * Agent status type
 */
type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'streaming'
  | 'executing_tools'
  | 'complete'
  | 'error';

/**
 * Tool call info for UI display
 */
interface ToolCallInfo {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: {
    output: string;
    error?: string;
    durationMs: number;
  };
}

/**
 * Options for useAgent hook
 */
interface UseAgentOptions {
  chatId: Id<'chats'>;
  projectId: Id<'projects'>;
  mode: ChatMode;
  provider: LLMProvider;
  model?: string;
}

/**
 * Return type for useAgent hook
 */
interface UseAgentReturn {
  // Messages
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    mode: ChatMode;
    toolCalls?: ToolCallInfo[];
  }>;

  // Input
  input: string;
  setInput: (input: string) => void;

  // Status
  status: AgentStatus;
  isLoading: boolean;
  currentIteration: number;

  // Tool calls
  toolCalls: ToolCallInfo[];

  // Artifacts
  pendingArtifacts: ReturnType<typeof useArtifactStore.getState>['artifacts'];

  // Actions
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  stop: () => void;
  clear: () => void;

  // Error
  error: string | null;
}

/**
 * Hook for AI agent with streaming and tool execution
 *
 * Features:
 * - Streaming chat with real-time updates
 * - Tool execution (read_files, write_files, run_command)
 * - Artifact queue integration for user approval
 * - Job creation for command execution
 * - Tool call deduplication and loop detection
 */
export function useAgent(options: UseAgentOptions): UseAgentReturn {
  const { chatId, projectId, mode, provider, model = 'gpt-4o' } = options;

  const convex = useConvex();

  // Convex mutations
  const addMessage = useMutation(api.messages.add);

  // Artifact store
  const addToQueue = useArtifactStore((state) => state.addToQueue);
  const artifacts = useArtifactStore((state) => state.artifacts);
  const pendingArtifacts = useMemo(
    () => artifacts.filter((a) => a.status === 'pending'),
    [artifacts]
  );

  // Local state
  const [messages, setMessages] = useState<UseAgentReturn['messages']>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [currentIteration, setCurrentIteration] = useState(0);
  const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs for controlling the agent
  const abortControllerRef = useRef<AbortController | null>(null);
  const isRunningRef = useRef(false);
  const toolContextRef = useRef<ReturnType<typeof createToolContext> | null>(null);
  const rafFlushRef = useRef<number | null>(null);

  // Create artifact queue helpers
  const artifactQueue = useRef({
    addFileArtifact: (path: string, content: string, originalContent?: string | null) => {
      const artifactId = `artifact-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const payload: FileWritePayload = {
        filePath: path,
        content,
        originalContent,
      };

      addToQueue({
        id: artifactId,
        type: 'file_write' as ArtifactType,
        payload,
        description: `File write: ${path}`,
      });

      toast.info('File artifact added to queue', {
        description: path,
      });
    },

    addCommandArtifact: (command: string, cwd?: string) => {
      const artifactId = `artifact-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const payload: CommandRunPayload = {
        command,
        workingDirectory: cwd,
      };

      addToQueue({
        id: artifactId,
        type: 'command_run' as ArtifactType,
        payload,
        description: `Command: ${command}`,
      });

      toast.info('Command artifact added to queue', {
        description: command,
      });
    },
  });

  // Initialize tool context (will be populated when Convex client is available)
  useEffect(() => {
    toolContextRef.current = createToolContext(
      projectId,
      chatId,
      'mock-user-id',
      convex,
      artifactQueue.current,
      { files: { batchGet: api.files.batchGet }, jobs: { create: api.jobs.create } }
    );
  }, [projectId, chatId, convex, addToQueue]);

  // Stop the agent
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (rafFlushRef.current !== null) {
      cancelAnimationFrame(rafFlushRef.current);
      rafFlushRef.current = null;
    }
    isRunningRef.current = false;
    setStatus('idle');
  }, []);

  // Clear messages
  const clear = useCallback(() => {
    setMessages([]);
    setToolCalls([]);
    setError(null);
    setCurrentIteration(0);
  }, []);

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  // Main submit handler
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (!input.trim() || isRunningRef.current) return;

      const userContent = input.trim();
      setInput('');

      // Capture a snapshot of prior conversation for prompt building.
      // Note: we exclude tool messages here because our UI message shape
      // doesn't retain tool_call_id, which some providers require.
      // IMPORTANT: Claude Code-style mode separation.
      // When in Discuss (Plan Mode), don't include Build messages in context (and vice versa),
      // otherwise the model continues implementation even after switching modes.
      const previousMessagesSnapshot = messages
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.mode === mode)
        .map((m) => ({ role: m.role, content: m.content }));

      // Add user message to local state
      const userMessageId = `msg-${Date.now()}-user`;
      setMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          role: 'user',
          content: userContent,
          mode,
        },
      ]);

      // Persist user message to Convex
      try {
        await addMessage({
          chatId,
          role: 'user',
          content: userContent,
        });
      } catch (err) {
        console.error('Failed to persist user message:', err);
      }

      // Start agent execution
      isRunningRef.current = true;
      abortControllerRef.current = new AbortController();
      setStatus('thinking');
      setError(null);

      try {
        // Create prompt context
        const promptContext: PromptContext = {
          projectId,
          chatId,
          userId: 'mock-user-id',
          chatMode: mode,
          // Use the configured provider type (e.g. "zai") rather than the
          // implementation class name (e.g. "openai-compatible").
          provider: provider?.config?.provider || 'openai',
          previousMessages: previousMessagesSnapshot,
          userMessage: userContent,
          customInstructions: undefined,
        };

        // Create runtime config with deduplication
        // Note: maxToolCallsPerIteration is set high to allow batch file generation
        // The AI should be able to generate as many files as needed in one iteration
        const runtimeConfig: RuntimeConfig = {
          maxIterations: 10,
          maxToolCallsPerIteration: 50,
          enableToolDeduplication: true,
          toolLoopThreshold: 3,
        };

        // Get tool context
        const toolContext =
          toolContextRef.current ||
          createToolContext(
            projectId,
            chatId,
            'mock-user-id',
            {
              query: async () => [],
              mutation: async () => '',
            },
            artifactQueue.current,
            { files: { batchGet: null }, jobs: { create: null } }
          );

        // Create agent runtime
        const runtime = createAgentRuntime(
          {
            provider,
            model,
            maxIterations: runtimeConfig.maxIterations,
          },
          toolContext
        );

        // Run the agent
        let assistantContent = '';
        let assistantToolCalls: ToolCallInfo[] = [];
        const assistantMessageId = `msg-${Date.now()}-assistant`;
        let pendingPaint = false;
        let replaceOnNextText = false;
        let rewriteNoticeShown = false;

        const schedulePaint = () => {
          if (pendingPaint) return;
          pendingPaint = true;
          rafFlushRef.current = requestAnimationFrame(() => {
            pendingPaint = false;
            rafFlushRef.current = null;
            setMessages((prev) => {
              const existingIndex = prev.findIndex((m) => m.id === assistantMessageId);
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  content: assistantContent,
                  mode,
                  toolCalls: assistantToolCalls,
                };
                return updated;
              }
              return [
                ...prev,
                {
                  id: assistantMessageId,
                  role: 'assistant',
                  content: assistantContent,
                  mode,
                  toolCalls: assistantToolCalls,
                },
              ];
            });
          });
        };

        for await (const event of runtime.run(promptContext, runtimeConfig)) {
          // Check for abort
          if (abortControllerRef.current?.signal.aborted) {
            break;
          }

          // Debug logging
          console.log('[useAgent] Event:', event.type, event.content?.slice(0, 50));

          switch (event.type) {
            case 'thinking': {
              setStatus('thinking');
              // Extract iteration number from content
              const iterationMatch = event.content?.match(/Iteration (\d+)/);
              if (iterationMatch) {
                setCurrentIteration(parseInt(iterationMatch[1], 10));
              }
              break;
            }

            case 'reset': {
              // Runtime requested that we reset the current assistant message
              // (e.g. Plan Mode auto-rewrite).
              // Keep the existing content visible to avoid the message "vanishing".
              // We’ll replace it cleanly when the first rewrite text chunk arrives.
              replaceOnNextText = true;
              assistantToolCalls = [];
              if (!rewriteNoticeShown) {
                rewriteNoticeShown = true;
                setMessages((prev) => {
                  const existingIndex = prev.findIndex((m) => m.id === assistantMessageId);
                  if (existingIndex < 0) return prev;
                  const updated = [...prev];
                  const existing = updated[existingIndex]!;
                  updated[existingIndex] = {
                    ...existing,
                    mode,
                    toolCalls: [],
                    content:
                      (existing.content ? existing.content + "\n\n" : "") +
                      "— Rewriting to match mode… —",
                  };
                  return updated;
                });
              }
              break;
            }

            case 'text':
              setStatus('streaming');
              if (event.content) {
                console.log('[useAgent] Text chunk:', event.content.slice(0, 30));
                if (replaceOnNextText) {
                  replaceOnNextText = false;
                  assistantContent = '';
                  // Immediately clear the visible content so we replace instead of append.
                  setMessages((prev) => {
                    const existingIndex = prev.findIndex((m) => m.id === assistantMessageId);
                    if (existingIndex < 0) return prev;
                    const updated = [...prev];
                    updated[existingIndex] = {
                      ...updated[existingIndex]!,
                      content: '',
                      mode,
                      toolCalls: [],
                    };
                    return updated;
                  });
                }
                assistantContent += event.content;
                // Paint at most once per animation frame to avoid render thrash
                // while still feeling like true streaming.
                schedulePaint();
              }
              break;

            case 'tool_call':
              setStatus('executing_tools');
              if (event.toolCall) {
                const toolInfo: ToolCallInfo = {
                  id: event.toolCall.id,
                  name: event.toolCall.function.name,
                  args: JSON.parse(event.toolCall.function.arguments),
                  status: 'pending',
                };
                assistantToolCalls.push(toolInfo);
                setToolCalls((prev) => [...prev, toolInfo]);

                // Update assistant message with tool calls
                setMessages((prev) => {
                  const existingIndex = prev.findIndex(
                    (m) => m.id === assistantMessageId
                  );
                  if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      mode,
                      toolCalls: assistantToolCalls,
                    };
                    return updated;
                  }
                  return prev;
                });
              }
              break;

            case 'tool_result':
              if (event.toolResult) {
                // Update tool call status
                setToolCalls((prev) =>
                  prev.map((tc) =>
                    tc.id === event.toolResult!.toolCallId
                      ? {
                          ...tc,
                          status: event.toolResult!.error ? 'error' : 'completed',
                          result: {
                            output: event.toolResult!.output,
                            error: event.toolResult!.error,
                            durationMs: event.toolResult!.durationMs,
                          },
                        }
                      : tc
                  )
                );

                // Update assistant message tool calls
                assistantToolCalls = assistantToolCalls.map((tc) =>
                  tc.id === event.toolResult!.toolCallId
                    ? {
                        ...tc,
                        status: event.toolResult!.error ? 'error' : 'completed',
                        result: {
                          output: event.toolResult!.output,
                          error: event.toolResult!.error,
                          durationMs: event.toolResult!.durationMs,
                        },
                      }
                    : tc
                );

                setMessages((prev) => {
                  const existingIndex = prev.findIndex(
                    (m) => m.id === assistantMessageId
                  );
                  if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      toolCalls: assistantToolCalls,
                    };
                    return updated;
                  }
                  return prev;
                });
              }
              break;

            case 'complete':
              setStatus('complete');
              isRunningRef.current = false;

              // Persist assistant message to Convex
              try {
                await addMessage({
                  chatId,
                  role: 'assistant',
                  content: assistantContent,
                });
              } catch (err) {
                console.error('Failed to persist assistant message:', err);
              }
              break;

            case 'error':
              setStatus('error');
              setError(event.error || 'Unknown error');
              isRunningRef.current = false;
              toast.error('Agent error', {
                description: event.error,
              });
              break;
          }
        }

        // Reset status if still running (e.g., aborted)
        if (isRunningRef.current) {
          setStatus('idle');
          isRunningRef.current = false;
        }
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
        isRunningRef.current = false;
        toast.error('Agent failed', {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [input, messages, chatId, projectId, mode, provider, model, addMessage]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    messages,
    input,
    setInput,
    status,
    isLoading:
      status === 'thinking' ||
      status === 'streaming' ||
      status === 'executing_tools',
    currentIteration,
    toolCalls,
    pendingArtifacts,
    handleSubmit,
    handleInputChange,
    stop,
    clear,
    error,
  };
}

/**
 * Hook for simple agent execution without streaming
 * Useful for one-off agent tasks
 */
export function useAgentSync(options: UseAgentOptions) {
  const [result, setResult] = useState<{
    content: string;
    toolResults: AgentEvent[];
    error?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const run = useCallback(
    async (content: string) => {
      setIsLoading(true);
      setResult(null);

      try {
        // TODO: Implement sync agent execution
        // This would call the runAgent helper function
        console.log('Running agent with content:', content);

        // Placeholder result
        setResult({
          content: 'Agent execution placeholder',
          toolResults: [],
        });
      } catch (error) {
        setResult({
          content: '',
          toolResults: [],
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  return { run, result, isLoading };
}

export default useAgent;
