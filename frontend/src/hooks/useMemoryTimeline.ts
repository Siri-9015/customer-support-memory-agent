/**
 * useMemoryTimeline — fetches and caches the full memory timeline for a customer.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import type { TimelineMemory } from '../types';

interface UseMemoryTimelineReturn {
  timeline: TimelineMemory[];
  isLoading: boolean;
  refresh: () => void;
}

export function useMemoryTimeline(customerId: string): UseMemoryTimelineReturn {
  const [timeline, setTimeline] = useState<TimelineMemory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTimeline = useCallback(async () => {
    if (!customerId) {
      setTimeline([]);
      return;
    }
    setIsLoading(true);
    try {
      const result = await api.getMemoryTimeline(customerId);
      setTimeline(result.memories || []);
    } catch (err) {
      console.warn('Failed to load memory timeline:', err);
      setTimeline([]);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  // Fetch when customer changes
  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return { timeline, isLoading, refresh: fetchTimeline };
}
