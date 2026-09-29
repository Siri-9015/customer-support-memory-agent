import { User, ChevronDown, Tag } from 'lucide-react';
import type { DemoCustomer } from '../types';

interface CustomerSelectorProps {
  customers: DemoCustomer[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const tagColors: Record<string, string> = {
  Network: 'bg-blue-100 text-blue-700',
  Display: 'bg-purple-100 text-purple-700',
  New:     'bg-gray-100 text-gray-600',
};

export function CustomerSelector({ customers, selectedId, onSelect }: CustomerSelectorProps) {
  const selected = customers.find((c) => c.id === selectedId);

  return (
    <div className="bg-white border-b border-gray-100 px-6 py-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <User className="w-3.5 h-3.5" />
          Customer
        </div>

        {/* Customer pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {customers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => onSelect(customer.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                selectedId === customer.id
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-600'
              }`}
            >
              {/* Avatar */}
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  selectedId === customer.id ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-700'
                }`}
              >
                {customer.avatar}
              </span>
              {customer.name}
              {/* Tag badge */}
              {selectedId !== customer.id && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-normal ${
                    tagColors[customer.tag] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {customer.tag}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Selected customer description */}
        {selected && (
          <div className="ml-auto text-xs text-gray-400 italic hidden sm:block">
            {selected.description}
          </div>
        )}
      </div>
    </div>
  );
}
