import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Users, AlertTriangle, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import { useSessions } from '@/hooks/useSessions';
import { useTasks } from '@/hooks/useTasks';
import { useAgents } from '@/hooks/useAgents';
import { useApprovals } from '@/hooks/useApprovals';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-400',
    completed: 'bg-slate-400',
    failed: 'bg-rose-400',
    paused: 'bg-amber-400',
    cancelled: 'bg-zinc-500',
    awaiting_approval: 'bg-amber-400',
    aborted: 'bg-rose-400',
    timed_out: 'bg-rose-400',
  };
  return (
    <span className={cn('inline-block w-2 h-2 rounded-full', colors[status] || 'bg-slate-500')} />
  );
}

function MetricCard({ label, value, icon, color }: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', color)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-100 font-mono">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export function MissionsPage() {
  const navigate = useNavigate();
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useSessions();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: approvals } = useApprovals();

  const isLoading = sessionsLoading || tasksLoading || agentsLoading;

  const activeSessions = (sessions || []).filter(
    (s) => s.status === 'active' || s.status === 'awaiting_approval' || s.status === 'paused'
  );
  const completedSessions = (sessions || []).filter((s) => s.status === 'completed');
  const failedSessions = (sessions || []).filter(
    (s) => s.status === 'failed' || s.status === 'aborted' || s.status === 'timed_out'
  );
  const pendingApprovals = (approvals || []).filter(
    (a) => a.status === 'pending' || a.status === 'PENDING'
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100">Mission Command Center</h1>
          <button
            onClick={() => refetchSessions()}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        <EmptyState
          icon={<Activity />}
          title="No missions found"
          description="No active sessions detected in the SYNAPSE backend. Create a mission through the SYNAPSE API to begin."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Mission Command Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time observability over all SYNAPSE missions and sessions.
          </p>
        </div>
        <button
          onClick={() => refetchSessions()}
          className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Active Sessions"
          value={activeSessions.length}
          icon={<Activity className="w-5 h-5 text-emerald-300" />}
          color="bg-emerald-500/10"
        />
        <MetricCard
          label="Completed"
          value={completedSessions.length}
          icon={<Users className="w-5 h-5 text-blue-300" />}
          color="bg-blue-500/10"
        />
        <MetricCard
          label="Failed / Aborted"
          value={failedSessions.length}
          icon={<AlertTriangle className="w-5 h-5 text-rose-300" />}
          color="bg-rose-500/10"
        />
        <MetricCard
          label="Pending Approvals"
          value={pendingApprovals.length}
          icon={<Clock className="w-5 h-5 text-amber-300" />}
          color="bg-amber-500/10"
        />
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Active Sessions
          </h2>
          <div className="space-y-2">
            {activeSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => navigate(`/runtime/${session.id}`)}
                className="w-full text-left bg-slate-900/80 border border-slate-800 rounded-xl p-4 hover:border-slate-700 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusDot status={session.status} />
                    <div>
                      <p className="text-sm font-medium text-slate-200 font-mono">
                        {session.title || `Session ${session.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Agent: {session.agentId.slice(0, 8)} · Status: {session.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{session.tokenUsage.totalTokens.toLocaleString()} tokens</span>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Completed */}
      {completedSessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Completed Sessions
          </h2>
          <div className="space-y-2">
            {completedSessions.slice(0, 5).map((session) => (
              <button
                key={session.id}
                onClick={() => navigate(`/runtime/${session.id}`)}
                className="w-full text-left bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 hover:border-slate-700 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusDot status={session.status} />
                    <div>
                      <p className="text-sm font-medium text-slate-300 font-mono">
                        {session.title || `Session ${session.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Completed · {session.tokenUsage.totalTokens.toLocaleString()} tokens
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Failed Sessions */}
      {failedSessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-rose-400/80 uppercase tracking-wider mb-3">
            Failed / Aborted
          </h2>
          <div className="space-y-2">
            {failedSessions.map((session) => (
              <div
                key={session.id}
                className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <StatusDot status={session.status} />
                  <div>
                    <p className="text-sm font-medium text-slate-300 font-mono">
                      {session.title || `Session ${session.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-rose-400/70 mt-0.5">
                      Status: {session.status}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
