import React, { useState } from 'react';
import {
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Phone,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XCircle,
  Database,
  Info,
} from 'lucide-react';
import { CallRecord } from '../types';

interface Props {
  call: CallRecord | null;
  onClose: () => void;
  onFeedbackUpdated: () => void;
}

export const CallDetailModal: React.FC<Props> = ({ call, onClose, onFeedbackUpdated }) => {
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState(call?.userFeedback);

  if (!call) return null;

  const handleFeedback = async (feedback: 'CONFIRMED_SPAM' | 'FALSE_POSITIVE' | 'LEGITIMATE') => {
    setIsSubmittingFeedback(true);
    try {
      const res = await fetch(`/api/calls/${call.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      if (res.ok) {
        setCurrentFeedback(feedback);
        onFeedbackUpdated();
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#121212] rounded-2xl border border-[#262626] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-white">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#161616]">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                call.status === 'CONNECTED'
                  ? 'bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]/40'
                  : call.status.startsWith('BLOCKED')
                  ? 'bg-[#FF3131]/20 text-[#FF3131] border border-[#FF3131]/40'
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
              }`}
            >
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{call.callerName}</h3>
                <span className="text-xs font-mono text-neutral-400">{call.callerNumber}</span>
              </div>
              <div className="text-xs text-neutral-400 font-mono mt-0.5">
                Call ID: <span className="text-neutral-200">{call.id}</span> • Source: {call.telephonySource}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Risk & Disposition Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-[#262626] bg-[#171717]">
              <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">Risk Score & Level</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className={`text-2xl font-mono font-bold ${
                    call.riskScore >= 70
                      ? 'text-[#FF3131]'
                      : call.riskScore >= 35
                      ? 'text-amber-400'
                      : 'text-[#00FF41]'
                  }`}
                >
                  {call.riskScore}/100
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    call.riskLevel === 'HIGH'
                      ? 'bg-red-500/20 text-[#FF3131] border border-red-500/30'
                      : call.riskLevel === 'MEDIUM'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]/30'
                  }`}
                >
                  {call.riskLevel}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#262626] bg-[#171717]">
              <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">Action Finalized</div>
              <div className="flex items-center gap-1.5 mt-2 text-xs font-mono font-bold">
                {call.recommendedAction === 'CONNECT' ? (
                  <span className="text-[#00FF41] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> CONNECTED TO RECIPIENT
                  </span>
                ) : call.recommendedAction === 'BLOCK' ? (
                  <span className="text-[#FF3131] flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" /> TERMINATED & BLOCKED
                  </span>
                ) : (
                  <span className="text-blue-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> SCREENED FURTHER
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#262626] bg-[#171717]">
              <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">Scam Category</div>
              <div className="text-sm font-semibold text-white mt-1.5 truncate">
                {call.scamCategory || 'Unclassified'}
              </div>
            </div>
          </div>

          {/* Layer 1 Reputation Breakdown */}
          <div className="p-5 rounded-xl border border-[#262626] bg-[#171717]">
            <div className="text-[10px] font-mono uppercase font-bold tracking-widest text-neutral-400 mb-3 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#00FF41]" /> LAYER 1: NUMBER REPUTATION PROVIDER
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <span className="text-neutral-400 text-[10px] block">PROVIDER:</span>
                <p className="font-bold text-white mt-0.5">{call.reputation.provider}</p>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px] block">SPAM SCORE:</span>
                <p className="font-bold text-white mt-0.5">{call.reputation.score}%</p>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px] block">LATENCY:</span>
                <p className="font-bold text-[#00FF41] mt-0.5">{call.reputation.lookupTimeMs} ms</p>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px] block">REPORTS:</span>
                <p className="font-bold text-white mt-0.5">{call.reputation.reportsCount}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-300 mt-3 bg-[#0a0a0a] p-3 rounded-lg border border-[#262626] font-mono">
              {call.reputation.details}
            </p>
          </div>

          {/* Signals & LLM Explanation */}
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-2">
                Detected Conversational Signals
              </div>
              <div className="flex flex-wrap gap-1.5">
                {call.detectedSignals.map((sig, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2.5 py-1 rounded font-semibold bg-red-500/10 border border-red-500/30 text-[#FF3131]"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {sig}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-1">
                Intent & AI Analysis
              </div>
              <p className="text-xs text-neutral-200 bg-[#171717] p-3.5 rounded-lg border border-[#262626] leading-relaxed">
                {call.explanation}
              </p>
            </div>
          </div>

          {/* Full Conversational Transcript */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-2">
              Screening Transcript Feed
            </div>
            <div className="p-4 rounded-xl border border-[#262626] bg-[#0a0a0a] space-y-3 max-h-60 overflow-y-auto font-mono text-xs">
              {call.transcript.map((item) => (
                <div key={item.id} className="flex gap-2.5">
                  <span
                    className={`shrink-0 uppercase text-[9px] font-bold px-1.5 py-0.5 rounded self-start ${
                      item.role === 'assistant'
                        ? 'bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]/30'
                        : item.role === 'caller'
                        ? 'bg-neutral-700 text-white'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {item.role}
                  </span>
                  <span className="text-neutral-300 leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback & Reputation Contribution */}
          <div className="pt-4 border-t border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-neutral-400 font-mono">
              Help train the local model: Verify or correct this classification.
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFeedback('CONFIRMED_SPAM')}
                disabled={isSubmittingFeedback}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentFeedback === 'CONFIRMED_SPAM'
                    ? 'bg-[#FF3131] text-black border-[#FF3131]'
                    : 'bg-[#1a1a1a] text-[#FF3131] border-red-500/30 hover:bg-red-500/20'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                CONFIRM SPAM
              </button>

              <button
                onClick={() => handleFeedback('FALSE_POSITIVE')}
                disabled={isSubmittingFeedback}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentFeedback === 'FALSE_POSITIVE'
                    ? 'bg-[#00FF41] text-black border-[#00FF41]'
                    : 'bg-[#1a1a1a] text-[#00FF41] border-[#00FF41]/30 hover:bg-[#00FF41]/20'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                FALSE POSITIVE / SAFE
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#262626] bg-[#161616] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-mono font-semibold rounded-lg border border-neutral-700 transition-colors cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
