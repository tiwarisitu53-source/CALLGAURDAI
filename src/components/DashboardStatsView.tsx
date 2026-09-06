import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  PhoneCall,
  PhoneOff,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ExternalLink,
  Layers,
  BarChart3,
  Activity,
} from 'lucide-react';
import { CallRecord, DashboardStats, RiskLevel } from '../types';

interface Props {
  stats: DashboardStats | null;
  calls: CallRecord[];
  onSelectCall: (call: CallRecord) => void;
  onRefreshCalls: () => void;
}

export const DashboardStatsView: React.FC<Props> = ({
  stats,
  calls,
  onSelectCall,
  onRefreshCalls,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  const filteredCalls = calls.filter((c) => {
    const matchesSearch =
      searchTerm === '' ||
      c.callerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.callerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.intent.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.scamCategory.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'CONNECTED' && c.status === 'CONNECTED') ||
      (statusFilter === 'BLOCKED' && (c.status === 'BLOCKED_LAYER1' || c.status === 'BLOCKED_AI')) ||
      (statusFilter === 'SCREENING' && c.status === 'SCREENING');

    const matchesRisk = riskFilter === 'ALL' || c.riskLevel === riskFilter;

    return matchesSearch && matchesStatus && matchesRisk;
  });

  const handleResetData = async () => {
    try {
      await fetch('/api/calls/seed', { method: 'POST' });
      onRefreshCalls();
    } catch (err) {
      console.error('Failed to seed default calls:', err);
    }
  };

  const getRiskBadge = (level: RiskLevel, score: number) => {
    if (level === 'HIGH') {
      return (
        <span className="font-mono text-xs font-bold text-[#FF3131]">
          {score < 10 ? `0${score}` : score}<span className="text-neutral-400 font-normal">/100</span>
        </span>
      );
    }
    if (level === 'MEDIUM') {
      return (
        <span className="font-mono text-xs font-bold text-amber-400">
          {score < 10 ? `0${score}` : score}<span className="text-neutral-400 font-normal">/100</span>
        </span>
      );
    }
    return (
      <span className="font-mono text-xs font-bold text-[#00FF41]">
        {score < 10 ? `0${score}` : score}<span className="text-neutral-400 font-normal">/100</span>
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'CONNECTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/25">
          CONNECTED
        </span>
      );
    }
    if (status.startsWith('BLOCKED')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono bg-[#FF3131]/10 text-[#FF3131] border border-[#FF3131]/25">
          BLOCKED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono bg-blue-500/10 text-blue-400 border border-blue-500/25">
        SCREENING
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Bento Grid: Metric & Telemetry Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Total Screened */}
        <div className="md:col-span-3 bg-[#121212] border border-[#262626] rounded-xl p-5 flex flex-col justify-center shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 mb-1">
            Total Screened
          </span>
          <div className="text-3xl font-bold font-mono tracking-tight text-white">
            {stats?.totalCalls ? stats.totalCalls.toLocaleString() : calls.length}
          </div>
          <div className="text-xs text-[#00FF41] font-mono mt-2 flex items-center gap-1">
            <span>↑ +12.4%</span>
            <span className="text-neutral-400">from yesterday</span>
          </div>
        </div>

        {/* Threats Blocked */}
        <div className="md:col-span-3 bg-[#121212] border border-[#262626] rounded-xl p-5 flex flex-col justify-center shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 mb-1">
            Threats Blocked
          </span>
          <div className="text-3xl font-bold font-mono tracking-tight text-[#FF3131] glow-red">
            {stats?.blockedCalls ?? calls.filter((c) => c.status.startsWith('BLOCKED')).length}
          </div>
          <div className="text-xs text-neutral-400 font-mono mt-2">
            23.9% total call volume
          </div>
        </div>

        {/* Live Risk Matrix Visualization (Matching Design HTML) */}
        <div className="md:col-span-6 bg-[#121212] border border-[#262626] rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">
              Live Risk Telemetry Matrix
            </span>
            <span className="text-[10px] font-mono text-[#00FF41] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse" />
              REAL-TIME SENSORS
            </span>
          </div>

          <div className="flex items-end gap-2.5 h-16 mt-3">
            <div className="w-full bg-neutral-800 h-full rounded-t relative overflow-hidden">
              <div className="absolute bottom-0 w-full bg-[#00FF41] opacity-60" style={{ height: '35%' }} />
            </div>
            <div className="w-full bg-neutral-800 h-full rounded-t relative overflow-hidden">
              <div className="absolute bottom-0 w-full bg-[#00FF41] opacity-60" style={{ height: '60%' }} />
            </div>
            <div className="w-full bg-neutral-800 h-full rounded-t relative overflow-hidden">
              <div className="absolute bottom-0 w-full bg-[#00FF41] opacity-60" style={{ height: '80%' }} />
            </div>
            <div className="w-full bg-neutral-800 h-full rounded-t relative overflow-hidden">
              <div className="absolute bottom-0 w-full bg-[#00FF41] opacity-60" style={{ height: '25%' }} />
            </div>
            <div className="w-full bg-neutral-800 h-full rounded-t relative overflow-hidden">
              <div className="absolute bottom-0 w-full bg-[#FF3131] opacity-80" style={{ height: '92%' }} />
            </div>
            <div className="w-full bg-neutral-800 h-full rounded-t relative overflow-hidden">
              <div className="absolute bottom-0 w-full bg-[#00FF41] opacity-60" style={{ height: '55%' }} />
            </div>
            <div className="w-full bg-neutral-800 h-full rounded-t relative overflow-hidden">
              <div className="absolute bottom-0 w-full bg-[#FF3131] opacity-80" style={{ height: '95%' }} />
            </div>
            <div className="w-full bg-neutral-800 h-full rounded-t relative overflow-hidden">
              <div className="absolute bottom-0 w-full bg-[#00FF41] opacity-60" style={{ height: '40%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bento Incoming Log (Recent Calls Table) */}
      <div className="bg-[#121212] rounded-xl border border-[#262626] shadow-sm overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-4 border-b border-[#262626] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#161616]">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00FF41]" />
              Incoming Log
            </h3>
            <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">
              {filteredCalls.length} RECORDED
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search caller ID, intent..."
                className="pl-8 pr-3 py-1 text-xs bg-[#0a0a0a] border border-[#262626] text-white rounded-lg focus:outline-none focus:border-[#00FF41] font-mono w-48 sm:w-60"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center rounded-lg border border-[#262626] bg-[#0a0a0a] p-0.5 text-xs font-mono">
              {(['ALL', 'CONNECTED', 'BLOCKED', 'SCREENING'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-[#1a1a1a] text-[#00FF41] border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              onClick={handleResetData}
              className="px-3 py-1 rounded-lg border border-[#262626] text-[10px] font-mono font-bold text-neutral-300 bg-[#1a1a1a] hover:bg-neutral-800 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset default demo scenarios"
            >
              <RotateCcw className="w-3 h-3" />
              RESET
            </button>
          </div>
        </div>

        {/* High Contrast Cyber Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141414] border-b border-[#262626] text-neutral-400 uppercase tracking-widest font-mono text-[10px]">
              <tr>
                <th className="py-3 px-5">Caller ID</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Intent</th>
                <th className="py-3 px-4">Scam Category</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-neutral-400 font-mono">
                    No calls match the search criteria.
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-white text-sm">{call.callerName}</div>
                      <div className="text-neutral-400 font-mono text-xs">{call.callerNumber}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-300">
                      <div>{call.reputation.provider}</div>
                      <div className="text-[10px] text-neutral-400">{call.reputation.score}% spam rating</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-[190px] truncate text-neutral-200" title={call.intent}>
                      {call.intent}
                    </td>
                    <td className="py-3.5 px-4 max-w-[170px] truncate text-neutral-400" title={call.scamCategory}>
                      {call.scamCategory}
                    </td>
                    <td className="py-3.5 px-4">{getRiskBadge(call.riskLevel, call.riskScore)}</td>
                    <td className="py-3.5 px-4">{getStatusBadge(call.status)}</td>
                    <td className="py-3.5 px-4 text-neutral-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => onSelectCall(call)}
                        className="px-2.5 py-1 text-[11px] font-mono font-bold text-[#00FF41] bg-[#00FF41]/10 border border-[#00FF41]/20 hover:bg-[#00FF41]/20 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        VIEW <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bento Grid: Telemetry Analytics Sub-Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Signals Frequency */}
        <div className="p-5 rounded-xl bg-[#121212] border border-[#262626] shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#00FF41]" />
              Detected Risk Signals
            </h3>
            <span className="text-[10px] font-mono text-neutral-400">TELEMETRY</span>
          </div>
          <div className="mt-4 space-y-3">
            {Object.entries(stats?.signalsFrequency || {
              'Financial requests': 2,
              'OTP/password/PIN requests': 2,
              Impersonation: 2,
              Urgency: 2,
              'Prize scam': 1,
              'Normal business/project/service context': 1,
            }).map(([signal, count], idx) => {
              const numCount = Number(count) || 0;
              const isNormal = signal.includes('Normal');
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-mono text-[11px]">{signal}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-28 h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          isNormal ? 'bg-[#00FF41]' : 'bg-[#FF3131]'
                        }`}
                        style={{ width: `${Math.min(100, (numCount / 3) * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-neutral-400 w-4 text-right">{numCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scam Categories Distribution */}
        <div className="p-5 rounded-xl bg-[#121212] border border-[#262626] shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#FF3131]" />
              Threat Classifications
            </h3>
            <span className="text-[10px] font-mono text-neutral-400">BREAKDOWN</span>
          </div>
          <div className="mt-4 space-y-3">
            {Object.entries(stats?.categoryDistribution || {
              'Financial Impersonation Scam': 1,
              'Prize & Advance Fee Scam': 1,
              'IRS Tax Impersonation Scam': 1,
              'None (Legitimate Context)': 1,
            }).map(([cat, count], idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-medium">{cat}</span>
                <span className="px-2.5 py-0.5 rounded font-mono text-[11px] font-bold bg-neutral-800 text-neutral-200 border border-neutral-700">
                  {count} calls
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
