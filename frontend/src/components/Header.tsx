import { Brain, Zap, LogOut } from 'lucide-react';
import type { DemoCustomer, HealthStatus } from '../types';

interface HeaderProps {
  health: HealthStatus | null;
  currentCustomer?: DemoCustomer | null;
  onSignOut?: () => void;
}

export function Header({ health, currentCustomer, onSignOut }: HeaderProps) {
  const hindsightOk = health?.hindsight_connected;
  const groqOk = health?.groq_configured;

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
      {/* Logo + Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-none">RecallDesk</h1>
          <p className="text-xs text-gray-500 mt-0.5">Customer Support with Memory</p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Hindsight status */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              hindsightOk === undefined
                ? 'bg-gray-300'
                : hindsightOk
                ? 'bg-emerald-500'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-xs text-gray-500">
            Hindsight{' '}
            <span className={hindsightOk ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
              {hindsightOk === undefined ? '…' : hindsightOk ? 'connected' : 'fallback'}
            </span>
          </span>
        </div>

        {/* Groq status */}
        <div className="flex items-center gap-1.5">
          <Zap className={`w-3.5 h-3.5 ${groqOk ? 'text-brand-500' : 'text-gray-400'}`} />
          <span className="text-xs text-gray-500">
            Groq{' '}
            <span className={groqOk ? 'text-brand-600 font-medium' : 'text-gray-400'}>
              {groqOk === undefined ? '…' : groqOk ? 'ready' : 'not configured'}
            </span>
          </span>
        </div>

        {/* Signed-in customer + sign-out */}
        {currentCustomer && onSignOut && (
          <>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                {currentCustomer.avatar}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                {currentCustomer.name}
              </span>
            </div>
            <button
              onClick={onSignOut}
              title="Switch customer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Switch</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
