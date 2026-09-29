import { useState } from 'react';
import { Brain, User, ArrowRight, Zap } from 'lucide-react';
import type { DemoCustomer } from '../types';

interface SignInPageProps {
  demoCustomers: DemoCustomer[];
  onSignIn: (customer: DemoCustomer) => void;
}

/** Turn a display name into a safe customer ID slug, e.g. "Jane Doe" → "jane-doe" */
function nameToId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Pick initials for the avatar, e.g. "Jane Doe" → "JD" */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

const tagColors: Record<string, string> = {
  Network: 'bg-blue-100 text-blue-700 border-blue-200',
  Display: 'bg-purple-100 text-purple-700 border-purple-200',
  New:     'bg-gray-100  text-gray-600  border-gray-200',
};

export function SignInPage({ demoCustomers, onSignIn }: SignInPageProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Filter out the generic "New Customer" slot from demo cards
  const demoCards = demoCustomers.filter((c) => c.id !== 'customer-new');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name to continue.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    const id = nameToId(trimmed);
    if (!id) {
      setError('Please use letters or numbers in your name.');
      return;
    }
    onSignIn({
      id: `customer-${id}`,
      name: trimmed,
      email: '',
      avatar: initials(trimmed),
      description: 'New customer session',
      tag: 'New',
    });
  }

  function handleDemoSelect(customer: DemoCustomer) {
    onSignIn(customer);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col items-center justify-center px-4">

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

        {/* Header band */}
        <div className="bg-brand-600 px-8 py-7 flex items-center gap-4">
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-none">RecallDesk</h1>
            <p className="text-sm text-blue-100 mt-0.5">Customer Support with Memory</p>
          </div>
        </div>

        <div className="px-8 py-7 space-y-6">

          {/* New customer form */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">Start a new session</h2>
            <p className="text-sm text-gray-500 mb-4">
              Enter your name and we'll remember your history across every conversation.
            </p>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  placeholder="Your name"
                  maxLength={60}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent placeholder-gray-400"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Start
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {error && (
              <p className="mt-2 text-xs text-red-500">{error}</p>
            )}
          </div>

          {/* Divider */}
          {demoCards.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">or try a demo customer</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
          )}

          {/* Demo customer cards */}
          {demoCards.length > 0 && (
            <div className="space-y-2">
              {demoCards.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleDemoSelect(customer)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-all text-left group"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold flex-shrink-0 group-hover:bg-brand-200 transition-colors">
                    {customer.avatar}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{customer.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-normal ${tagColors[customer.tag] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {customer.tag}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{customer.description}</p>
                  </div>

                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="px-8 pb-6">
          <p className="text-xs text-gray-400 flex items-start gap-1.5">
            <Zap className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-300" />
            Your conversation history is stored in Hindsight and recalled automatically in future sessions.
          </p>
        </div>
      </div>
    </div>
  );
}
