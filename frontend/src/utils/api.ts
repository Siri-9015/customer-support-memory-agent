/**
 * API client for RecallDesk backend.
 * All requests go through /api which Vite proxies to http://localhost:8000
 */

import type { ChatResponse, DemoCustomer, HealthStatus, MemoryItem, TimelineMemory } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  /** Send a chat message and receive an AI response with recalled memories. */
  async chat(customerId: string, message: string, sessionId?: string): Promise<ChatResponse> {
    return request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: customerId,
        message,
        session_id: sessionId,
      }),
    });
  },

  /** Retrieve all memories for a customer (Memory Timeline). */
  async getMemoryTimeline(customerId: string): Promise<{ memories: TimelineMemory[]; count: number; source: string }> {
    return request(`/memory/timeline/${encodeURIComponent(customerId)}`);
  },

  /** Explicitly recall memories for a given query. */
  async recallMemories(customerId: string, query: string): Promise<{ memories: MemoryItem[]; memory_count: number; source: string }> {
    return request('/memory/recall', {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId, query }),
    });
  },

  /** Explicitly retain a memory. */
  async retainMemory(customerId: string, content: string, context?: string): Promise<{ success: boolean; message: string }> {
    return request('/memory/retain', {
      method: 'POST',
      body: JSON.stringify({ customer_id: customerId, content, context }),
    });
  },

  /** Get demo customers. */
  async getDemoCustomers(): Promise<{ customers: DemoCustomer[] }> {
    return request('/customers/demo');
  },

  /** Check backend health. */
  async getHealth(): Promise<HealthStatus> {
    return request('/health');
  },

  /** Re-seed demo data. */
  async reseedDemo(): Promise<{ success: boolean; message: string }> {
    return request('/demo/seed', { method: 'POST' });
  },
};
