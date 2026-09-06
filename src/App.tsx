import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  PhoneCall,
  LayoutDashboard,
  Database,
  Smartphone,
  Sparkles,
  Activity,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { CallRecord, DashboardStats } from './types';
import { LiveCallSimulator } from './components/LiveCallSimulator';
import { DashboardStatsView } from './components/DashboardStatsView';
import { ReputationHub } from './components/ReputationHub';
import { AndroidIntegrationView } from './components/AndroidIntegrationView';
import { CallDetailModal } from './components/CallDetailModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'SIMULATOR' | 'DASHBOARD' | 'REPUTATION' | 'ANDROID'>('SIMULATOR');
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch('/api/calls');
      if (res.ok) {
        const data = await res.json();
        setCalls(data);
      }
    } catch (err) {
      console.error('Failed to load calls:', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    await Promise.all([fetchCalls(), fetchStats()]);
  }, [fetchCalls, fetchStats]);

  useEffect(() => {
    setIsLoading(true);
    refreshAllData().finally(() => setIsLoading(false));
  }, [refreshAllData]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-[#00FF41] selection:text-black">
      {/* Global Bento Navigation Header */}
      <header className="bg-[#121212] border-b border-[#262626] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Identity */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#00FF41] rounded-lg flex items-center justify-center text-black font-extrabold text-base shadow-[0_0_12px_rgba(0,255,65,0.3)]">
                G
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-tight text-white">
                    CALLGUARD<span className="text-[#00FF41]">AI</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
                    v0.8.2-HACKATHON
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 hidden sm:block">
                  Dual-Layer Voice Call Screening & Scam Risk Detection
                </p>
              </div>
            </div>

            {/* Navigation Tabs (Bento Pill Dock) */}
            <nav className="flex items-center gap-1 bg-[#0a0a0a] border border-[#262626] p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('SIMULATOR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'SIMULATOR'
                    ? 'bg-[#1a1a1a] text-[#00FF41] border border-[#333333] shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Voice Simulator</span>
              </button>

              <button
                onClick={() => setActiveTab('DASHBOARD')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'DASHBOARD'
                    ? 'bg-[#1a1a1a] text-[#00FF41] border border-[#333333] shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Incoming Log</span>
                {calls.length > 0 && (
                  <span className="ml-1 text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.2 rounded font-mono">
                    {calls.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('REPUTATION')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hidden md:flex ${
                  activeTab === 'REPUTATION'
                    ? 'bg-[#1a1a1a] text-[#00FF41] border border-[#333333] shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Reputation Hub</span>
              </button>

              <button
                onClick={() => setActiveTab('ANDROID')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hidden lg:flex ${
                  activeTab === 'ANDROID'
                    ? 'bg-[#1a1a1a] text-[#00FF41] border border-[#333333] shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android Telecom</span>
              </button>
            </nav>

            {/* Status Badges Matching Design HTML */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-semibold">Reputation Engine</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse" />
                  TRUECALLER ACTIVE
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-semibold">Network Link</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41]" />
                  SECURE WEBHOOK
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Bento Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'SIMULATOR' && (
          <LiveCallSimulator
            onCallCompleted={refreshAllData}
            onSelectCallForDetails={(call) => setSelectedCall(call)}
          />
        )}

        {activeTab === 'DASHBOARD' && (
          <DashboardStatsView
            stats={stats}
            calls={calls}
            onSelectCall={(call) => setSelectedCall(call)}
            onRefreshCalls={refreshAllData}
          />
        )}

        {activeTab === 'REPUTATION' && <ReputationHub />}

        {activeTab === 'ANDROID' && <AndroidIntegrationView />}
      </main>

      {/* Detail Inspector Modal */}
      {selectedCall && (
        <CallDetailModal
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
          onFeedbackUpdated={refreshAllData}
        />
      )}

      {/* Bento Cyber Footer */}
      <footer className="border-t border-[#262626] bg-[#0d0d0d] py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">CALLGUARD<span className="text-[#00FF41]">AI</span></span>
            <span>•</span>
            <span>Natural Generic TTS Voice (Zephyr)</span>
            <span>•</span>
            <span className="text-neutral-400">Zero Voice Impersonation</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Webhook: <code className="text-[#00FF41]">/api/voice/webhook</code></span>
            <span>•</span>
            <span className="text-neutral-300">Android CallScreeningService: &lt;5s Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
