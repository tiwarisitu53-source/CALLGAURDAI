import React from 'react';
import {
  Smartphone,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Code2,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const AndroidIntegrationView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 5-Second Constraint Architecture Callout Bento */}
      <div className="bg-[#121212] border border-amber-500/30 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold mb-1">
              Critical Android Telecom Framework Constraint
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              The ~5-Second Response Window Enforcement
            </h3>
            <p className="text-xs text-neutral-300 mt-2 leading-relaxed font-sans">
              Android mandates that <code className="bg-neutral-800 text-amber-300 px-1.5 py-0.5 rounded font-mono text-[11px]">CallScreeningService</code>{' '}
              must return an answer to <code className="bg-neutral-800 text-amber-300 px-1.5 py-0.5 rounded font-mono text-[11px]">onScreenCall()</code> within approximately <strong>5 seconds</strong>.
              If a screening service fails to respond within this strict deadline, Android times out and passes the call directly to the phone's native dialer.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-300">
              <span className="flex items-center gap-1.5 bg-[#171717] border border-[#262626] px-2.5 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF41]" />
                Zero long LLM blocking in Telecom Service
              </span>
              <span className="flex items-center gap-1.5 bg-[#171717] border border-[#262626] px-2.5 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF41]" />
                Sub-50ms local hash blacklist checks
              </span>
              <span className="flex items-center gap-1.5 bg-[#171717] border border-[#262626] px-2.5 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF41]" />
                Conversational screening via Twilio / Cloud webhooks
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Layer Architecture Diagram Bento Grid */}
      <div className="bg-[#121212] rounded-xl border border-[#262626] p-6 shadow-sm">
        <div className="pb-4 border-b border-[#262626]">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#00FF41] mb-1 font-semibold">
            System Separation of Concerns
          </div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00FF41]" />
            Dual-Layer Processing Pipeline
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            How CallGuard separates on-device phone protection from conversational cloud voice screening:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Layer 1 Phone Container */}
          <div className="p-5 rounded-xl border border-[#262626] bg-[#171717]">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <Smartphone className="w-4 h-4 text-[#00FF41]" />
                Component 1: Android Telecom Service
              </div>
              <span className="text-[10px] font-mono font-bold text-[#00FF41] bg-[#00FF41]/10 border border-[#00FF41]/25 px-2 py-0.5 rounded">
                &lt; 150 ms LATENCY
              </span>
            </div>
            <ul className="mt-4 space-y-2.5 text-xs text-neutral-300 font-sans">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00FF41] shrink-0 mt-0.5" />
                <span>Runs directly in Android <code className="font-mono text-white bg-neutral-800 px-1 py-0.2 rounded">CallScreeningService</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00FF41] shrink-0 mt-0.5" />
                <span>Checks local database and high-confidence blacklists instantly.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00FF41] shrink-0 mt-0.5" />
                <span>
                  Calls <code className="font-mono text-white bg-neutral-800 px-1 py-0.2 rounded">respondToCall()</code> with <code className="font-mono text-white bg-neutral-800 px-1 py-0.2 rounded">setRejectCall(true)</code> on confirmed scam numbers.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00FF41] shrink-0 mt-0.5" />
                <span>Guaranteed non-blocking operation well within the 5-second deadline.</span>
              </li>
            </ul>
          </div>

          {/* Layer 2 Cloud Container */}
          <div className="p-5 rounded-xl border border-[#262626] bg-[#171717]">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <Code2 className="w-4 h-4 text-[#00FF41]" />
                Component 2: Programmable Telephony Demo
              </div>
              <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 border border-purple-500/25 px-2 py-0.5 rounded">
                MULTI-TURN LLM
              </span>
            </div>
            <ul className="mt-4 space-y-2.5 text-xs text-neutral-300 font-sans">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00FF41] shrink-0 mt-0.5" />
                <span>Powered by Twilio programmable telephony & CallGuard webhooks.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00FF41] shrink-0 mt-0.5" />
                <span>Conversational AI greets unknown callers and asks adaptive clarifying questions.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00FF41] shrink-0 mt-0.5" />
                <span>Speech-to-text converts caller voice; LLM evaluates conversational risk signals.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00FF41] shrink-0 mt-0.5" />
                <span>Routes safe calls to user or terminates suspicious callers.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Kotlin Code Snippet (Bento Terminal) */}
      <div className="bg-[#080808] border border-[#262626] text-neutral-200 rounded-xl p-6 shadow-sm font-mono text-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#262626] text-neutral-400 gap-2">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-[#00FF41]" />
            <span className="text-white">android/.../CallScreeningServiceImpl.kt</span>
          </div>
          <span className="text-[10px] text-[#00FF41] bg-[#00FF41]/10 px-2.5 py-0.5 rounded border border-[#00FF41]/25 w-fit">
            Android 10+ (API 29+) Compliant
          </span>
        </div>
        <pre className="mt-4 overflow-x-auto text-[11px] leading-relaxed text-neutral-300">{`class CallScreeningServiceImpl : CallScreeningService() {
    override fun onScreenCall(callDetails: Call.Details) {
        val rawHandle = callDetails.handle?.schemeSpecificPart ?: ""
        val cleanNumber = rawHandle.replace(Regex("[^0-9+]"), "")

        // 1. Ultra-fast local blacklist lookup (<50ms)
        if (LocalSpamCache.isSpam(cleanNumber)) {
            val response = CallResponse.Builder()
                .setDisallowCall(true)
                .setRejectCall(true)
                .setSkipNotification(false)
                .build()

            respondToCall(callDetails, response)
            return
        }

        // 2. Safe or unknown callers: allow through within 5-second deadline
        val allowResponse = CallResponse.Builder()
            .setDisallowCall(false)
            .setRejectCall(false)
            .build()
        respondToCall(callDetails, allowResponse)
    }
}`}</pre>
      </div>
    </div>
  );
};
