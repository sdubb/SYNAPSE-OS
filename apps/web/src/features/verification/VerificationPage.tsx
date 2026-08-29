import React, { useState } from 'react';
import { useVerification } from '../../hooks/trust-governance.js';
import { Card, StatMetric, VerdictBadge, Button, Badge } from '../../components/ui/trust-ui.js';
import { VerifiedTaskItem, VerificationVerdict } from '../../types/trust-governance.js';

export function VerificationPage({ onSelectTask }: { onSelectTask?: (taskId: string) => void }) {
  const { metrics, tasks, loading, error, refresh } = useVerification();
  const [filterVerdict, setFilterVerdict] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTasks = tasks.filter(t => {
    const matchesVerdict = filterVerdict === 'ALL' || t.verdict === filterVerdict;
    const matchesSearch = 
      t.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.workspaceName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesVerdict && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Trust Center & Verification</h1>
            <Badge variant="cyan">Zero-Trust Merkle Evidence</Badge>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Independent ground-truth evaluation, multi-vector assertion probes, and tamper-proof evidence validation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            <span>↻</span> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => onSelectTask ? onSelectTask('ver-001') : null}>
            Inspect Latest Evidence
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-sm">
          Failed to load verification metrics: {error}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatMetric
          label="Total Verified"
          value={metrics?.completed ?? (loading ? '...' : 0)}
          variant="default"
        />
        <StatMetric
          label="Passed"
          value={metrics?.passed ?? (loading ? '...' : 0)}
          variant="success"
          change={metrics ? `${Math.round((metrics.passed / (metrics.completed || 1)) * 100)}%` : undefined}
        />
        <StatMetric
          label="Failed"
          value={metrics?.failed ?? (loading ? '...' : 0)}
          variant="danger"
        />
        <StatMetric
          label="In Review"
          value={metrics?.inReview ?? (loading ? '...' : 0)}
          variant="warning"
        />
        <StatMetric
          label="Pass Rate"
          value={metrics ? `${metrics.passRatePercentage}%` : (loading ? '...' : '0%')}
          variant="cyan"
        />
        <StatMetric
          label="Avg Latency"
          value={metrics ? `${(metrics.avgVerificationTimeMs / 1000).toFixed(1)}s` : (loading ? '...' : '0s')}
          variant="default"
        />
      </div>

      {/* Task List and Filters */}
      <Card
        title="Verified Task Execution History"
        subtitle="Cryptographically sealed verification records across all agent run sessions"
        action={
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search task, agent, or workspace..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 w-64"
            />
            <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
              {['ALL', 'PASS', 'REVIEW', 'FAIL'].map(v => (
                <button
                  key={v}
                  onClick={() => setFilterVerdict(v)}
                  className={`px-2.5 py-1 rounded-md transition ${
                    filterVerdict === v
                      ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto -mx-5 -my-5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/40 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="py-3.5 px-5">Task Objective & Context</th>
                <th className="py-3.5 px-4">Agent</th>
                <th className="py-3.5 px-4">Workspace</th>
                <th className="py-3.5 px-4">Verdict</th>
                <th className="py-3.5 px-4">Assertions</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Root Hash (SHA-256)</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-xs text-zinc-300">
              {loading && tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    Loading verification records...
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    No verified tasks match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t: VerifiedTaskItem) => (
                  <tr
                    key={t.id}
                    className="hover:bg-zinc-800/40 transition group cursor-pointer"
                    onClick={() => onSelectTask && onSelectTask(t.id)}
                  >
                    <td className="py-4 px-5">
                      <div className="font-medium text-zinc-100 text-sm group-hover:text-cyan-400 transition">
                        {t.taskTitle}
                      </div>
                      <div className="text-zinc-500 text-[11px] mt-0.5 font-mono">
                        {t.taskId} • Verified at {new Date(t.verifiedAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-zinc-200 font-medium">{t.agentName}</div>
                      <div className="text-zinc-500 text-[11px] font-mono">{t.agentId}</div>
                    </td>
                    <td className="py-4 px-4 text-zinc-400">{t.workspaceName}</td>
                    <td className="py-4 px-4">
                      <VerdictBadge verdict={t.verdict as VerificationVerdict} />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-emerald-400 font-semibold">{t.assertionsSummary.passed}</span>
                        <span className="text-zinc-600">/</span>
                        <span className="font-mono text-zinc-400">{t.assertionsSummary.total}</span>
                        {t.assertionsSummary.failed > 0 && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 text-[10px] font-bold">
                            {t.assertionsSummary.failed} fail
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-zinc-400">
                      {(t.durationMs / 1000).toFixed(2)}s
                    </td>
                    <td className="py-4 px-4 font-mono text-zinc-500 text-[11px]">
                      <span className="bg-zinc-950 px-2 py-1 rounded border border-zinc-800/80">
                        {t.evidenceRootHash.substring(0, 10)}...{t.evidenceRootHash.substring(58)}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e?.stopPropagation();
                          if (onSelectTask) onSelectTask(t.id);
                        }}
                      >
                        Inspect Detail →
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
