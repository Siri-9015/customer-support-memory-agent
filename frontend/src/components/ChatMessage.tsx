import { Brain, User, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { Message } from '../types';
import { formatTime, contextColor, contextIcon } from '../utils/helpers';

interface ChatMessageProps {
  message: Message;
  customerAvatar: string;
}

export function ChatMessage({ message, customerAvatar }: ChatMessageProps) {
  const [showMemories, setShowMemories] = useState(false);
  const isUser = message.role === 'user';
  const hasMemories = (message.memories_used?.length ?? 0) > 0;

  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
        isUser
          ? 'bg-brand-600 text-white'
          : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
      }`}>
        {isUser ? customerAvatar : <Brain className="w-4 h-4" />}
      </div>

      {/* Bubble + metadata */}
      <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Message bubble */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-brand-600 text-white rounded-tr-sm'
            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
        }`}>
          {message.content}
        </div>

        {/* Timestamp + memory badge */}
        <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>

          {/* Memory indicator — only on assistant messages */}
          {!isUser && hasMemories && (
            <button
              onClick={() => setShowMemories((v) => !v)}
              className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full hover:bg-emerald-100 transition-colors"
              aria-expanded={showMemories}
              aria-label="Toggle recalled memories"
            >
              <Brain className="w-3 h-3" />
              {message.memory_count} {message.memory_count === 1 ? 'memory' : 'memories'} recalled
              {showMemories ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}

          {/* Fallback indicator */}
          {!isUser && message.memory_source === 'fallback' && (
            <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
              fallback memory
            </span>
          )}
        </div>

        {/* Expanded memories */}
        {!isUser && showMemories && hasMemories && (
          <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-3 mt-1 animate-fade-in">
            <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1">
              <Brain className="w-3.5 h-3.5" />
              Memory recalled for this response:
            </p>
            <ul className="space-y-1.5">
              {message.memories_used!.map((mem, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                  <span className="text-base leading-none">{contextIcon(mem.context)}</span>
                  <span>{mem.content}</span>
                  {mem.context && (
                    <span className={`ml-auto flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${contextColor(mem.context)}`}>
                      {mem.context}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
