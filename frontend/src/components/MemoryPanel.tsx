import { Brain, Clock, RefreshCw, Loader2, AlertCircle, Database } from 'lucide-react';
import { contextColor, contextIcon, formatDateTime } from '../utils/helpers';
import type { TimelineMemory, MemoryItem } from '../types';

interface MemoryPanelProps {
  customerId: string;
  currentMemories: MemoryItem[];   // Memories used in the last response
  timeline: TimelineMemory[];       // All stored memories for this customer
  isLoadingTimeline: boolean;
  onRefreshTimeline: () => void;
  memorySource: string;
}

export function MemoryPanel({
  customerId,
  currentMemories,
  timeline,
  isLoadingTimeline,
  onRefreshTimeline,
  memorySource,
}: MemoryPanelProps) {
  const hasCurrentMemories = currentMemories.length > 0;
  const hasTimeline = timeline.length > 0;

  return (
    <aside className="w-80 flex flex-col bg-gray-50 border-l border-gray-200 overflow-hidden">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-semibold text-gray-800">Memory</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Source badge */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            memorySource === 'hindsight'
              ? 'bg-emerald-100 text-emerald-700'
              : memorySource === 'fallback'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {memorySource === 'hindsight' ? '⚡ Hindsight' : memorySource === 'fallback' ? '⚠ fallback' : 'no memory'}
          </span>
          <button
            onClick={onRefreshTimeline}
            disabled={isLoadingTimeline}
            className="p-1 text-gray-400 hover:text-brand-600 transition-colors rounded"
            aria-label="Refresh memory timeline"
          >
            {isLoadingTimeline
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />
            }
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── Section 1: Recalled for last response ── */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Recalled for last response
          </h3>

          {!hasCurrentMemories ? (
            <div className="text-xs text-gray-400 italic text-center py-3">
              No memories recalled yet.<br />
              Send a message to see memory in action.
            </div>
          ) : (
            <ul className="space-y-2">
              {currentMemories.map((mem, i) => (
                <li
                  key={i}
                  className="bg-white rounded-lg border border-emerald-200 p-2.5 shadow-sm animate-fade-in"
                >
                  <div className="flex items-start gap-1.5">
                    <span className="text-sm leading-none mt-0.5">{contextIcon(mem.context)}</span>
                    <p className="text-xs text-gray-700 flex-1 leading-relaxed">{mem.content}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {mem.context && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${contextColor(mem.context)}`}>
                        {mem.context}
                      </span>
                    )}
                    {mem.timestamp && (
                      <span className="text-[10px] text-gray-400 ml-auto">
                        {formatDateTime(mem.timestamp)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Section 2: Memory Timeline ── */}
        <div className="p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Memory Timeline
            {hasTimeline && (
              <span className="ml-auto text-[10px] bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-full font-medium">
                {timeline.length}
              </span>
            )}
          </h3>

          {isLoadingTimeline ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : !customerId ? (
            <div className="text-xs text-gray-400 italic text-center py-3">
              Select a customer to view their memory.
            </div>
          ) : !hasTimeline ? (
            <div className="text-xs text-gray-400 italic text-center py-3 flex flex-col items-center gap-1">
              <Database className="w-5 h-5 text-gray-300" />
              No memories stored yet for this customer.
              <br />Start chatting to build their memory.
            </div>
          ) : (
            <ul className="space-y-2">
              {timeline.map((mem, i) => (
                <li
                  key={i}
                  className="bg-white rounded-lg border border-gray-200 p-2.5 text-xs shadow-sm"
                >
                  <div className="flex items-start gap-1.5">
                    <span className="text-sm leading-none mt-0.5">{contextIcon(mem.context)}</span>
                    <p className="text-gray-700 flex-1 leading-relaxed">{mem.content}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {mem.context && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${contextColor(mem.context)}`}>
                        {mem.context}
                      </span>
                    )}
                    {mem.timestamp && (
                      <span className="text-[10px] text-gray-400 ml-auto">
                        {formatDateTime(mem.timestamp)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </aside>
  );
}
