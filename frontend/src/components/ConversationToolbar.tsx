import { Trash2, RefreshCw, Loader2 } from 'lucide-react';

interface ConversationToolbarProps {
  customerName: string;
  messageCount: number;
  onClear: () => void;
  onReseedDemo: () => void;
  isReseeding: boolean;
}

export function ConversationToolbar({
  customerName,
  messageCount,
  onClear,
  onReseedDemo,
  isReseeding,
}: ConversationToolbarProps) {
  return (
    <div className="bg-white border-b border-gray-100 px-6 py-2 flex items-center justify-between">
      <div className="text-xs text-gray-500">
        <span className="font-medium text-gray-700">{customerName}</span>
        {messageCount > 0 && (
          <span className="ml-2 text-gray-400">
            · {messageCount} message{messageCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Re-seed demo data */}
        <button
          onClick={onReseedDemo}
          disabled={isReseeding}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-600 transition-colors px-2 py-1 rounded hover:bg-brand-50"
          title="Re-seed demo memories into Hindsight"
        >
          {isReseeding ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Reset demo
        </button>

        {/* Clear conversation */}
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
          title="Clear conversation history"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear chat
        </button>
      </div>
    </div>
  );
}
