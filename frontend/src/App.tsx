import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SignInPage } from './components/SignInPage';
import { CustomerSelector } from './components/CustomerSelector';
import { ChatArea } from './components/ChatArea';
import { ChatInput } from './components/ChatInput';
import { MemoryPanel } from './components/MemoryPanel';
import { ConversationToolbar } from './components/ConversationToolbar';
import { useChat } from './hooks/useChat';
import { useMemoryTimeline } from './hooks/useMemoryTimeline';
import { api } from './utils/api';
import type { DemoCustomer, HealthStatus } from './types';

export default function App() {
  // ── Sign-in state ─────────────────────────────────────────────────────────
  // null  = not signed in (show SignInPage)
  // DemoCustomer = signed in (show main app)
  const [signedInCustomer, setSignedInCustomer] = useState<DemoCustomer | null>(null);

  // ── App state ─────────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState<DemoCustomer[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isReseeding, setIsReseeding] = useState(false);

  // The "selected customer" in the selector bar is always the signed-in one
  const selectedCustomerId = signedInCustomer?.id ?? '';

  // Chat state — re-initialises when customer changes
  const { messages, isLoading, lastMemories, lastMemorySource, sendMessage, clearMessages } =
    useChat(selectedCustomerId);

  // Memory timeline
  const { timeline, isLoading: isLoadingTimeline, refresh: refreshTimeline } =
    useMemoryTimeline(selectedCustomerId);

  // ── Load demo customers + health on mount ─────────────────────────────────
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [{ customers: demoCustomers }, healthData] = await Promise.all([
          api.getDemoCustomers(),
          api.getHealth(),
        ]);
        setCustomers(demoCustomers);
        setHealth(healthData);
      } catch (err) {
        console.warn('Backend not reachable on startup:', err);
        // Static fallback so the sign-in page demo cards still render
        setCustomers([
          { id: 'customer-alice', name: 'Alice Johnson', email: 'alice@example.com', avatar: 'AJ', description: 'Wi-Fi issues on Windows 11', tag: 'Network' },
          { id: 'customer-bob',   name: 'Bob Chen',     email: 'bob@example.com',   avatar: 'BC', description: 'Monitor flickering on macOS', tag: 'Display' },
          { id: 'customer-new',   name: 'New Customer', email: 'new@example.com',   avatar: 'NC', description: 'No previous interactions',    tag: 'New' },
        ]);
      }
    };
    loadInitial();
  }, []);

  // Poll health every 30s
  useEffect(() => {
    const timer = setInterval(async () => {
      try { setHealth(await api.getHealth()); } catch { /* silent */ }
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  // Refresh timeline after assistant replies (memory was just retained)
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      const t = setTimeout(refreshTimeline, 1500);
      return () => clearTimeout(t);
    }
  }, [messages, refreshTimeline]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSignIn = useCallback((customer: DemoCustomer) => {
    setSignedInCustomer(customer);
    clearMessages();
  }, [clearMessages]);

  const handleSignOut = useCallback(() => {
    setSignedInCustomer(null);
    clearMessages();
  }, [clearMessages]);

  const handleReseedDemo = async () => {
    setIsReseeding(true);
    try {
      await api.reseedDemo();
      setTimeout(refreshTimeline, 500);
    } catch (err) {
      console.warn('Reseed failed:', err);
    } finally {
      setIsReseeding(false);
    }
  };

  // ── Sign-in gate ──────────────────────────────────────────────────────────
  if (!signedInCustomer) {
    return (
      <SignInPage
        demoCustomers={customers}
        onSignIn={handleSignIn}
      />
    );
  }

  // ── Main app ──────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Top header — shows signed-in customer + switch button */}
      <Header
        health={health}
        currentCustomer={signedInCustomer}
        onSignOut={handleSignOut}
      />

      {/* Customer selector bar (shows only the signed-in customer) */}
      <CustomerSelector
        customers={[signedInCustomer]}
        selectedId={selectedCustomerId}
        onSelect={() => {}}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: Chat panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ConversationToolbar
            customerName={signedInCustomer.name}
            messageCount={messages.length}
            onClear={clearMessages}
            onReseedDemo={handleReseedDemo}
            isReseeding={isReseeding}
          />

          <ChatArea
            messages={messages}
            isLoading={isLoading}
            customer={signedInCustomer}
          />

          <ChatInput
            onSend={sendMessage}
            isLoading={isLoading}
            disabled={false}
          />
        </div>

        {/* Right: Memory panel */}
        <MemoryPanel
          customerId={selectedCustomerId}
          currentMemories={lastMemories}
          timeline={timeline}
          isLoadingTimeline={isLoadingTimeline}
          onRefreshTimeline={refreshTimeline}
          memorySource={lastMemorySource}
        />
      </div>
    </div>
  );
}
