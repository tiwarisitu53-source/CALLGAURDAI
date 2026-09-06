import React, { useState } from 'react';
import {
  Database,
  ShieldCheck,
  ShieldAlert,
  Server,
  Code2,
  CheckCircle2,
  XCircle,
  Search,
  ExternalLink,
  Layers,
  PhoneForwarded,
  Key,
  Info,
} from 'lucide-react';
import { ReputationResult } from '../types';

export const ReputationHub: React.FC = () => {
  const [testNumber, setTestNumber] = useState('+1 800 555 0199');
  const [lookupResult, setLookupResult] = useState<ReputationResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Quick test predefined numbers
  const testCases = [
    { label: 'Known IRS Robocall', number: '+1 800 555 0199' },
    { label: 'Electricity Bill Fraud', number: '+91 98765 43210' },
    { label: 'Prize Lottery Fraud', number: '+91 80012 34567' },
    { label: 'Safe Mobile Contact', number: '+91 98201 54321' },
  ];

  const handleCheckReputation = async (numToTest?: string) => {
    const num = numToTest || testNumber;
    setIsSearching(true);
    try {
      const res = await fetch('/api/reputation/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: num }),
      });
      if (res.ok) {
        const data = await res.json();
        setLookupResult(data);
      }
    } catch (err) {
      console.error('Reputation lookup failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview & Architecture Bento Box */}
      <div className="bg-[#121212] rounded-xl border border-[#262626] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#00FF41] mb-1 font-semibold">
              Layer 1 Screening Engine
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-[#00FF41]" />
              Modular Reputation Provider Architecture
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Decoupled multi-provider interface screening incoming caller IDs in under 50ms before routing to conversational AI.
            </p>
          </div>
          <span className="px-3 py-1 bg-[#00FF41]/10 text-[#00FF41] text-xs font-mono font-bold rounded-full border border-[#00FF41]/25 flex items-center gap-1.5 w-fit">
            <ShieldCheck className="w-4 h-4" /> ZERO DOWNTIME FAIL-SAFE
          </span>
        </div>

        {/* 3 Providers Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* Provider 1: Local Spam Database */}
          <div className="p-5 rounded-xl border border-[#262626] bg-[#171717] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00FF41] bg-[#00FF41]/10 border border-[#00FF41]/20 px-2 py-0.5 rounded">
                  Local Provider
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-[#00FF41]">
                  <span className="w-2 h-2 rounded-full bg-[#00FF41]" /> ACTIVE
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">LocalSpamDatabaseProvider</h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                In-memory hash index of known robocallers, telecom blacklist entries, and fraudulent syndicate numbers.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-800 text-xs text-neutral-400 flex justify-between font-mono">
              <span>Avg Latency:</span>
              <strong className="text-[#00FF41]">&lt; 15 ms</strong>
            </div>
          </div>

          {/* Provider 2: User Report Provider */}
          <div className="p-5 rounded-xl border border-[#262626] bg-[#171717] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                  Crowd Sourced
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-[#00FF41]">
                  <span className="w-2 h-2 rounded-full bg-[#00FF41]" /> ACTIVE
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">UserReportProvider</h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Aggregates end-user feedback and reported fraudulent attempts to dynamically update community threat scores.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-800 text-xs text-neutral-400 flex justify-between font-mono">
              <span>Feedback Loop:</span>
              <strong className="text-white">DYNAMIC SYNC</strong>
            </div>
          </div>

          {/* Provider 3: Truecaller Provider */}
          <div className="p-5 rounded-xl border border-[#262626] bg-[#171717] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                  Official API
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> STANDBY
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">TruecallerProvider</h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Connects only via official enterprise developer credentials. Gracefully falls back when API key is unconfigured.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-800 text-xs text-neutral-400 flex justify-between font-mono">
              <span>Fail-Safe:</span>
              <strong className="text-[#00FF41]">FALLBACK READY</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Layer 1 Number Reputation Tester */}
      <div className="bg-[#121212] rounded-xl border border-[#262626] p-6 shadow-sm">
        <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
          <Search className="w-4 h-4 text-[#00FF41]" />
          TEST REPUTATION SCREENING ENGINE
        </h3>
        <p className="text-xs text-neutral-400 mt-1">
          Perform a sub-millisecond Layer 1 reputation query on any phone number to test provider resolution.
        </p>

        {/* Preset quick test badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-xs text-neutral-400 self-center font-mono mr-1">Quick Select:</span>
          {testCases.map((tc, i) => (
            <button
              key={i}
              onClick={() => {
                setTestNumber(tc.number);
                handleCheckReputation(tc.number);
              }}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded-md border border-[#262626] bg-[#171717] hover:border-neutral-500 text-neutral-300 transition-colors cursor-pointer"
            >
              {tc.label} <span className="text-neutral-400">({tc.number})</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={testNumber}
            onChange={(e) => setTestNumber(e.target.value)}
            placeholder="+1 800 555 0199 or +91 98765 43210"
            className="flex-1 px-3.5 py-2 text-sm font-mono bg-[#080808] border border-[#262626] text-white rounded-lg focus:outline-none focus:border-[#00FF41]"
          />
          <button
            onClick={() => handleCheckReputation()}
            disabled={isSearching}
            className="px-6 py-2 bg-[#00FF41] hover:bg-[#00e63a] text-black text-sm font-bold font-mono tracking-tight rounded-lg shadow-[0_0_12px_rgba(0,255,65,0.25)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSearching ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                QUERYING...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                EVALUATE REPUTATION
              </>
            )}
          </button>
        </div>

        {/* Results Bento Sub-Card */}
        {lookupResult && (
          <div className="mt-5 p-5 rounded-xl border border-[#262626] bg-[#161616]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#262626]">
              <div className="flex items-center gap-3">
                {lookupResult.isSpam ? (
                  <XCircle className="w-6 h-6 text-[#FF3131]" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-[#00FF41]" />
                )}
                <div>
                  <span className="text-sm font-bold text-white font-mono">
                    {lookupResult.category}
                  </span>
                  <div className="text-xs text-neutral-400 font-mono">
                    Provider: {lookupResult.provider} • Latency: {lookupResult.lookupTimeMs}ms
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold font-mono ${
                    lookupResult.isSpam
                      ? 'bg-red-500/10 text-[#FF3131] border border-red-500/30'
                      : 'bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30'
                  }`}
                >
                  Spam Score: {lookupResult.score}/100
                </span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-md font-bold font-mono text-black ${
                    lookupResult.isSpam ? 'bg-[#FF3131]' : 'bg-[#00FF41]'
                  }`}
                >
                  {lookupResult.isSpam ? 'LAYER 1 BLOCK' : 'ROUTE TO AI'}
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 mt-3 font-mono leading-relaxed">{lookupResult.details}</p>
          </div>
        )}
      </div>

      {/* Twilio Telephony Webhook Inspector (Dark Terminal) */}
      <div className="bg-[#121212] rounded-xl border border-[#262626] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#262626]">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <PhoneForwarded className="w-4 h-4 text-[#00FF41]" />
              PROGRAMMABLE TELEPHONY (TWILIO TWIML WEBHOOK)
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Live Voice Webhook URL for connecting Twilio phone numbers to the CallGuard conversational engine.
            </p>
          </div>
          <span className="text-xs font-mono bg-[#080808] border border-[#262626] px-2.5 py-1 rounded text-[#00FF41]">
            POST /api/voice/webhook
          </span>
        </div>

        <div className="mt-4 p-5 rounded-xl bg-[#060606] border border-[#262626] text-neutral-200 font-mono text-xs overflow-x-auto">
          <div className="text-neutral-400 mb-2">// Sample TwiML response generated by CallGuard AI Webhook:</div>
          <pre className="text-neutral-300 leading-relaxed">{`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" timeout="4" speechTimeout="auto" action="/api/voice/webhook" method="POST">
        <Say voice="Polly.Matthew">
            Hello. I am CallGuard, an automated call screening assistant. Who is calling and what is the purpose of your call?
        </Say>
    </Gather>
    <Say voice="Polly.Matthew">I did not hear a response. Please call back later.</Say>
    <Hangup/>
</Response>`}</pre>
        </div>
      </div>
    </div>
  );
};
