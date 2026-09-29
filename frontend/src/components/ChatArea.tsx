import { useEffect, useRef } from 'react';
import { MessageSquare, Bot } from 'lucide-react';
import type { Message, DemoCustomer } from '../types';
import { ChatMessage } from './ChatMessage';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  customer: DemoCustomer | null;
}

export function ChatArea({ messages, isLoading, customer }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!customer) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-50 text-center px-8">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-brand-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Select a Customer</h2>
          <p className="text-sm text-gray-400 max-w-xs">
            Choose a demo customer above to start a support conversation and see Hindsight memory in action.
          </p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-50 text-center px-8">
        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
          <Bot className="w-7 h-7 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            Hi, I'm RecallDesk AI
          </h2>
          <p className="text-sm text-gray-500 max-w-sm">
            I remember <span className="font-medium text-brand-600">{customer.name}</span>'s previous
            interactions. Try asking about a recurring issue — I'll know the history.
          </p>
          <p className="text-xs text-gray-400 mt-3 italic">
            Tip: Use the demo prompts below to quickly demonstrate memory recall.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
      {messages.map((msg) => (
        <ChatMessage
          key={msg.id}
          message={msg}
          customerAvatar={customer.avatar}
        />
      ))}

      {/* Typing indicator */}
      {isLoading && (
        <div className="flex gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
