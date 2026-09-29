/**
 * useChat — manages conversation state for a specific customer.
 *
 * Handles:
 * - Sending messages to the backend
 * - Storing conversation history (per customer)
 * - Tracking the last set of recalled memories
 * - Loading/error state
 */

import { useState, useCallback } from 'react';
import { api } from '../utils/api';
import { generateId } from '../utils/helpers';
import type { Message, MemoryItem } from '../types';

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  lastMemories: MemoryItem[];
  lastMemorySource: string;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
}

export function useChat(customerId: string): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMemories, setLastMemories] = useState<MemoryItem[]>([]);
  const [lastMemorySource, setLastMemorySource] = useState<string>('none');

  const sendMessage = useCallback(async (content: string) => {
    if (!customerId || !content.trim()) return;

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.chat(customerId, content.trim());

      const assistantMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: response.response,
        timestamp: response.timestamp,
        memories_used: response.memories_used,
        memory_count: response.memory_count,
        memory_source: response.memory_source,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setLastMemories(response.memories_used);
      setLastMemorySource(response.memory_source);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send message.';
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: `⚠️ Error: ${msg} Please check your backend is running.`,
          timestamp: new Date().toISOString(),
          memory_count: 0,
          memory_source: 'none',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMemories([]);
    setLastMemorySource('none');
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    lastMemories,
    lastMemorySource,
    sendMessage,
    clearMessages,
  };
}
