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

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
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

  // Convex mutations
  const addMessage = useMutation(api.messages.add);

  // Artifact store
  const artifactStore = useArtifactStore();
  const addToQueue = useArtifactStore((state) => state.addToQueue);
  const pendingArtifacts = useArtifactStore(
    (state) => state.artifacts
  ).filter((a) => a.status === 'pending');

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

  // Create artifact queue helpers
  const artifactQueue = useRef({
    addFileArtifact: (path: string, content: string) => {
      const artifactId = `artifact-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const payload: FileWritePayload = {
        filePath: path,
        content,
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
    // Get Convex client from the React context
    // Note: This assumes the component is wrapped in ConvexProvider
    const convexClient = {
      query: async (query: any, args: any) => {
        // This will be populated by the actual Convex client
        // when the hook is used within a ConvexProvider
        throw new Error('Convex client not initialized');
      },
      mutation: async (mutation: any, args: any) => {
        throw new Error('Convex client not initialized');
      },
    };

    // For now, create a mock context that will work with the store
    // In production, this should integrate with actual Convex mutations
    toolContextRef.current = {
      projectId,
      chatId,
      userId: 'mock-user-id',
      readFiles: async (paths: string[]) => {
        // TODO: Integrate with Convex files.batchGet
        // This is a placeholder that should be replaced with actual Convex query
        console.log('Reading files:', paths);
        return paths.map((path) => ({ path, content: null }));
      },
      writeFiles: async (files: Array<{ path: string; content: string }>) => {
        const results: Array<{ path: string; success: boolean; error?: string }> = [];

        for (const file of files) {
          try {
            artifactQueue.current.addFileArtifact(file.path, file.content);
            results.push({ path: file.path, success: true });
          } catch (err) {
            results.push({
              path: file.path,
              success: false,
              error: err instanceof Error ? err.message : 'Failed to queue',
            });
          }
        }

        return results;
      },
      runCommand: async (command: string, timeout?: number, cwd?: string) => {
        const startTime = Date.now();

        // Queue command artifact
        artifactQueue.current.addCommandArtifact(command, cwd);

        // TODO: Create actual job in Convex
        // For now, just return a success response
        console.log('Creating job for command:', command);

        return {
          stdout: `Command queued: ${command}`,
          stderr: '',
          exitCode: 0,
          durationMs: Date.now() - startTime,
        };
      },
    };
  }, [projectId, chatId, addToQueue]);

  // Stop the agent
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
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

      // Add user message to local state
      const userMessageId = `msg-${Date.now()}-user`;
      setMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          role: 'user',
          content: userContent,
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
          customInstructions: undefined,
        };

        // Create runtime config with deduplication
        const runtimeConfig: RuntimeConfig = {
          maxIterations: 10,
          maxToolCallsPerIteration: 5,
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

        for await (const event of runtime.run(promptContext, runtimeConfig)) {
          // Check for abort
          if (abortControllerRef.current?.signal.aborted) {
            break;
          }

          switch (event.type) {
            case 'thinking':
              setStatus('thinking');
              // Extract iteration number from content
              const iterationMatch = event.content?.match(/Iteration (\d+)/);
              if (iterationMatch) {
                setCurrentIteration(parseInt(iterationMatch[1], 10));
              }
              break;

            case 'text':
              setStatus('streaming');
              if (event.content) {
                assistantContent += event.content;
                // Update the assistant message in real-time
                setMessages((prev) => {
                  const existingIndex = prev.findIndex(
                    (m) => m.id === assistantMessageId
                  );
                  if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      content: assistantContent,
                      toolCalls: assistantToolCalls,
                    };
                    return updated;
                  } else {
                    return [
                      ...prev,
                      {
                        id: assistantMessageId,
                        role: 'assistant',
                        content: assistantContent,
                        toolCalls: assistantToolCalls,
                      },
                    ];
                  }
                });
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
    [input, chatId, projectId, mode, provider, model, addMessage]
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
