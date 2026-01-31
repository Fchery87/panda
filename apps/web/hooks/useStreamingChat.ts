/**
 * useStreamingChat Hook
 * 
 * Custom React hook for streaming chat using @ai-sdk/react's useChat
 * Connects to Convex HTTP action and persists messages to Convex.
 * 
 * @file apps/web/hooks/useStreamingChat.ts
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { useChat, type Message } from '@ai-sdk/react';
import { useMutation } from 'convex/react';
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Chat mode type
 */
type ChatMode = 'discuss' | 'build';

/**
 * Options for useStreamingChat
 */
interface UseStreamingChatOptions {
  chatId: Id<'chats'>;
  projectId: Id<'projects'>;
  mode: ChatMode;
  initialMessages?: Message[];
  onError?: (error: Error) => void;
  onFinish?: () => void;
}

/**
 * Return type for useStreamingChat
 */
interface UseStreamingChatReturn {
  messages: Message[];
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  error: Error | undefined;
  handleSubmit: (e?: React.FormEvent) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  reload: () => void;
  stop: () => void;
  append: (message: Message) => void;
}

/**
 * Hook for streaming chat with Convex integration
 * 
 * Features:
 * - Streams responses from Convex HTTP action
 * - Persists messages to Convex after streaming completes
 * - Supports both 'discuss' and 'build' modes
 * - Integrates with existing messages.ts mutations
 */
export function useStreamingChat(options: UseStreamingChatOptions): UseStreamingChatReturn {
  const { chatId, projectId, mode, initialMessages = [], onError, onFinish } = options;
  
  // Convex mutations for persisting messages
  const addMessage = useMutation(api.messages.add);
  
  // Track pending message persistence
  const pendingMessageRef = useRef<{ role: 'user' | 'assistant'; content: string } | null>(null);
  
  // Use Vercel AI SDK's useChat hook
  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit: aiHandleSubmit,
    isLoading,
    error,
    reload,
    stop,
    append,
  } = useChat({
    api: `${process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.cloud', '.site')}/llm/streamChat`,
    initialMessages,
    body: {
      mode,
      chatId,
      projectId,
    },
    onError: (err) => {
      console.error('Streaming error:', err);
      onError?.(err);
    },
    onFinish: async (message) => {
      // Persist the assistant's message to Convex
      try {
        if (message.content) {
          await addMessage({
            chatId,
            role: 'assistant',
            content: message.content,
          });
        }
      } catch (err) {
        console.error('Failed to persist assistant message:', err);
      }
      onFinish?.();
    },
  });

  // Enhanced submit handler that persists user message first
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (!input.trim()) return;

      const userContent = input.trim();

      // Clear input immediately for better UX
      setInput('');

      // Persist user message to Convex first
      try {
        await addMessage({
          chatId,
          role: 'user',
          content: userContent,
        });
      } catch (err) {
        console.error('Failed to persist user message:', err);
        // Continue with streaming even if persistence fails
      }

      // Submit to AI for streaming
      aiHandleSubmit(e);
    },
    [input, chatId, addMessage, aiHandleSubmit, setInput]
  );

  return {
    messages,
    input,
    setInput,
    isLoading,
    error: error ?? undefined,
    handleSubmit,
    handleInputChange,
    reload,
    stop,
    append,
  };
}

/**
 * Hook for streaming chat with manual message management
 * Alternative to useStreamingChat with more control over message persistence
 */
export function useStreamingChatManual(options: UseStreamingChatOptions): UseStreamingChatReturn & {
  persistMessage: (role: 'user' | 'assistant', content: string) => Promise<void>;
} {
  const { chatId, mode, initialMessages = [], onError, onFinish } = options;
  
  // Convex mutations
  const addMessage = useMutation(api.messages.add);
  const [isPersisting, setIsPersisting] = useState(false);
  
  // Build the HTTP action URL
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const apiUrl = convexUrl 
    ? `${convexUrl.replace('.cloud', '.site')}/llm/streamChat`
    : '/api/chat'; // Fallback to Next.js API route
  
  // Use Vercel AI SDK's useChat hook
  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit: aiHandleSubmit,
    isLoading,
    error,
    reload,
    stop,
    append: aiAppend,
  } = useChat({
    api: apiUrl,
    initialMessages,
    body: {
      mode,
      chatId,
    },
    onError: (err) => {
      console.error('Streaming error:', err);
      onError?.(err);
    },
    onFinish: () => {
      onFinish?.();
    },
  });

  // Persist a message to Convex
  const persistMessage = useCallback(
    async (role: 'user' | 'assistant', content: string) => {
      setIsPersisting(true);
      try {
        await addMessage({
          chatId,
          role,
          content,
        });
      } finally {
        setIsPersisting(false);
      }
    },
    [chatId, addMessage]
  );

  // Enhanced submit handler
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (!input.trim()) return;

      const userContent = input.trim();

      // Clear input immediately
      setInput('');

      // Persist user message
      await persistMessage('user', userContent);

      // Submit to AI
      aiHandleSubmit(e);

      // Note: Assistant message persistence would need to be handled
      // by listening to the stream completion, which is tricky with
      // the current useChat API. Consider using useStreamingChat instead.
    },
    [input, setInput, persistMessage, aiHandleSubmit]
  );

  // Enhanced append that persists user messages
  const append = useCallback(
    async (message: Message) => {
      if (message.role === 'user') {
        await persistMessage('user', message.content);
      }
      aiAppend(message);
    },
    [aiAppend, persistMessage]
  );

  return {
    messages,
    input,
    setInput,
    isLoading: isLoading || isPersisting,
    error: error ?? undefined,
    handleSubmit,
    handleInputChange,
    reload,
    stop,
    append,
    persistMessage,
  };
}

export default useStreamingChat;
