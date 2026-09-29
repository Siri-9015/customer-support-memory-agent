// Core types for RecallDesk frontend

export interface MemoryItem {
  content: string;
  relevance_score?: number | null;
  timestamp?: string | null;
  context?: string | null;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  memories_used?: MemoryItem[];
  memory_count?: number;
  memory_source?: 'hindsight' | 'fallback' | 'none';
}

export interface ChatResponse {
  customer_id: string;
  message: string;
  response: string;
  memories_used: MemoryItem[];
  memory_count: number;
  memory_source: 'hindsight' | 'fallback' | 'none';
  session_id?: string;
  timestamp: string;
}

export interface DemoCustomer {
  id: string;
  name: string;
  email: string;
  avatar: string;
  description: string;
  tag: string;
}

export interface HealthStatus {
  status: string;
  hindsight_connected: boolean;
  groq_configured: boolean;
  version: string;
  message: string;
}

export interface TimelineMemory {
  content: string;
  context?: string;
  timestamp?: string;
  relevance_score?: number | null;
}

export type MemorySource = 'hindsight' | 'fallback' | 'none';
