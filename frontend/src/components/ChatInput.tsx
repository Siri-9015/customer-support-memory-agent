import { Send, Loader2 } from 'lucide-react';
import { useState, useRef, type KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const DEMO_PROMPTS = [
  "My Wi-Fi keeps disconnecting again.",
  "The issue from last time is back.",
  "What troubleshooting steps did we try before?",
  "My monitor is flickering again.",
];

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3">
      {/* Demo prompt chips */}
      <div className="flex gap-2 flex-wrap mb-2">
        {DEMO_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => setValue(prompt)}
            className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors border border-gray-200"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={disabled ? 'Select a customer to start chatting…' : 'Type your message… (Enter to send, Shift+Enter for newline)'}
          disabled={disabled || isLoading}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: '44px', maxHeight: '120px' }}
          aria-label="Chat message input"
        />
        <button
          onClick={handleSend}
          disabled={!value.trim() || isLoading || disabled}
          className="flex-shrink-0 w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
