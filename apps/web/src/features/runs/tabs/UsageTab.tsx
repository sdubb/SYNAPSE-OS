import React from 'react';
import { RunUsageReport } from '../../../types/index.js';
import { Cpu, DollarSign, Zap, TrendingDown, Layers, Database } from 'lucide-react';
import { MetricCard } from '../../../components/ui/index.js';

export const UsageTab: React.FC<{ usage: RunUsageReport | null }> = ({ usage }) => {
  if (!usage) {
    return <div className="text-slate-400 text-sm">No token usage data recorded for this run.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Metric summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Tokens"
          value={usage.totalTokens.toLocaleString()}
          subtitle="Full prompt + completion"
          icon={<Cpu className="w-5 h-5" />}
        />
        <MetricCard
          title="Monetary Cost"
          value={`$${usage.totalCostUsd.toFixed(4)}`}
          subtitle="Real-time provider billing"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <MetricCard
          title="Prompt Cache Reads"
          value={usage.cacheReadTokens.toLocaleString()}
          subtitle="Cached tokens utilized"
          icon={<Database className="w-5 h-5" />}
        />
        <MetricCard
          title="Token Velocity"
          value={`${usage.tokenVelocityPerMinute.toLocaleString()}/min`}
          subtitle="Throughput metric"
          icon={<Zap className="w-5 h-5" />}
        />
      </div>

      {/* Model Breakdown Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            LLM Provider & Model Accounting Breakdown
          </h4>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/40 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Model ID</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Calls Count</th>
              <th className="px-4 py-3">Prompt Tokens</th>
              <th className="px-4 py-3">Completion Tokens</th>
              <th className="px-4 py-3">Cache Tokens</th>
              <th className="px-4 py-3">Estimated Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {usage.models.map((m) => (
              <tr key={m.modelId} className="hover:bg-slate-800/40">
                <td className="px-4 py-3 font-semibold text-cyan-300">{m.modelId}</td>
                <td className="px-4 py-3 text-slate-400 capitalize">{m.provider}</td>
                <td className="px-4 py-3 text-slate-300">{m.callsCount}</td>
                <td className="px-4 py-3 text-slate-300">{m.promptTokens.toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-300">{m.completionTokens.toLocaleString()}</td>
                <td className="px-4 py-3 text-cyan-400">{m.cacheTokens.toLocaleString()}</td>
                <td className="px-4 py-3 font-bold text-emerald-400">${m.costUsd.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
