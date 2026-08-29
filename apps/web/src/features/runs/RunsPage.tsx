import React, { useState, useMemo } from 'react';
import { useRuns } from '../../hooks/useApi.js';
import { RunItem } from '../../types/index.js';
import {
  Play,
  Search,
  Filter,
  Clock,
  Cpu,
  Coins,
  Bot,
  Activity,
  Layers,
  ChevronRight,
  Terminal,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Button, Input, Select, StatusBadge, EmptyState, MetricCard } from '../../components/ui/index.js';

interface RunsPageProps {
  onSelectRun?: (runId: string) => void;
  onOpenLive?: (runId: string) => void;
}

export const RunsPage: React.FC<RunsPageProps> = ({ onSelectRun, onOpenLive }) => {
  const { runs, loading, refetch } = useRuns();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('all');

  const statusOptions = ['all', 'running', 'waiting', 'verification', 'completed', 'failed'];

  // Distinct agent list
  const uniqueAgents = useMemo(() => {
    const map = new Map<string, string>();
    runs.forEach((r) => map.set(r.agentId, r.agentName));
    return Array.from(map.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [runs]);

  // Filtered runs
  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesAgent = r.agentName.toLowerCase().includes(q);
        const matchesId = r.id.toLowerCase().includes(q) || r.clineSessionId.toLowerCase().includes(q);
        const matchesMission = r.missionTitle?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAgent && !matchesId && !matchesMission) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const normStatus = r.status.toLowerCase();
        if (statusFilter === 'running' && !['running', 'active'].includes(normStatus)) return false;
        if (statusFilter === 'waiting' && !['waiting', 'awaiting_approval', 'awaiting_input', 'paused'].includes(normStatus)) return false;
        if (statusFilter === 'verification' && !['verifying', 'verification'].includes(normStatus)) return false;
        if (statusFilter === 'completed' && normStatus !== 'completed') return false;
        if (statusFilter === 'failed' && !['failed', 'aborted', 'cancelled', 'terminated'].includes(normStatus)) return false;
      }

      // Agent filter
      if (agentFilter !== 'all' && r.agentId !== agentFilter) {
        return false;
      }

      return true;
    });
  }, [runs, searchQuery, statusFilter, agentFilter]);

  const activeRunningCount = runs.filter((r) => ['running', 'active'].includes(r.status.toLowerCase())).length;
  const waitingApprovalCount = runs.filter((r) => ['awaiting_approval', 'waiting'].includes(r.status.toLowerCase())).length;
  const verifyingCount = runs.filter((r) => ['verifying'].includes(r.status.toLowerCase())).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Execution Runs & Sessions
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Forensic tracking and live observation of all autonomous agent execution runs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Refresh Runs
          </Button>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Executions"
          value={activeRunningCount}
          subtitle="Currently streaming"
          icon={<Play className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          title="Awaiting Approval"
          value={waitingApprovalCount}
          subtitle="Requires human sign-off"
          icon={<Clock className="w-5 h-5 text-amber-400" />}
        />
        <MetricCard
          title="Under Verification"
          value={verifyingCount}
          subtitle="Ground truth validation"
          icon={<Sparkles className="w-5 h-5 text-cyan-400" />}
        />
        <MetricCard
          title="Total Recorded Runs"
          value={runs.length}
          subtitle="Historical session logs"
          icon={<Layers className="w-5 h-5" />}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="w-full md:flex-1">
            <Input
              icon={<Search className="w-4 h-4 text-slate-400" />}
              placeholder="Search runs by title, agent, mission, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="bg-slate-950 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:border-cyan-500"
            >
              <option value="all">All Agents</option>
              {uniqueAgents.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>

            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-slate-950 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:border-cyan-500"
            >
              <option value="all">All Time</option>
              <option value="1h">Last 1 Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
        </div>

        {/* Status Pill Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-800/80">
          <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {statusOptions.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Runs List */}
      {filteredRuns.length === 0 ? (
        <EmptyState
          title="No execution runs found"
          description="Try adjusting your search query, status filters, or agent selection."
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setAgentFilter('all');
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredRuns.map((run) => (
            <div
              key={run.id}
              onClick={() => onSelectRun?.(run.id)}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 hover:bg-slate-900 transition-all cursor-pointer shadow-sm group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={run.status} size="sm" />
                    <span className="text-xs font-mono text-slate-500">
                      ID: {run.id} · Session: {run.clineSessionId.slice(0, 10)}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                    {run.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300 font-medium">
                      <Bot className="w-3.5 h-3.5 text-cyan-400" />
                      {run.agentName}
                    </span>

                    {run.missionTitle && (
                      <span className="text-slate-400">
                        Mission: <strong className="text-slate-300">{run.missionTitle}</strong>
                      </span>
                    )}

                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {Math.floor(run.durationSeconds / 60)}m {run.durationSeconds % 60}s
                    </span>

                    <span className="flex items-center gap-1 font-mono">
                      <Cpu className="w-3.5 h-3.5 text-slate-500" />
                      {run.tokenUsage.totalTokens.toLocaleString()} tokens
                    </span>

                    <span className="flex items-center gap-1 font-mono text-emerald-400 font-semibold">
                      <Coins className="w-3.5 h-3.5" />
                      ${run.tokenUsage.estimatedCostUsd.toFixed(3)}
                    </span>
                  </div>

                  {run.activeStep && (
                    <div className="text-xs text-cyan-300/90 font-mono bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/80 truncate max-w-2xl mt-1">
                      ● Active: {run.activeStep}
                    </div>
                  )}
                </div>

                {/* Right Quick Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {onOpenLive && ['running', 'active'].includes(run.status.toLowerCase()) && (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Terminal className="w-3.5 h-3.5" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenLive(run.id);
                      }}
                    >
                      Live Stream
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" icon={<ChevronRight className="w-3.5 h-3.5" />}>
                    Forensic Deep-Dive
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
