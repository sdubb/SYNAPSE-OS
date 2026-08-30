import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Users, AlertTriangle, Clock, ArrowRight, RefreshCw,
  Cpu, Zap, ShieldCheck, Pause, Play, Square, Eye,
} from 'lucide-react';
import { useSessions } from '@/hooks/useSessions';
import { useTasks } from '@/hooks/useTasks';
import { useAgents } from '@/hooks/useAgents';
import { useApprovals } from '@/hooks/useApprovals';
import { useAuditLogs } from '@/hooks/useAudit';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

// ── Status helpers ─────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-400 shadow-emerald-400/50',
    completed: 'bg-slate-400',
    failed: 'bg-rose-400 shadow-rose-400/50',
    paused: 'bg-amber-400 shadow-amber-400/50',
    cancelled: 'bg-zinc-500',
    awaiting_approval: 'bg-amber-400 shadow-amber-400/50 animate-pulse',
    aborted: 'bg-rose-400 shadow-rose-400/50',
    timed_out: 'bg-rose-400 shadow-rose-400/50',
    initializing: 'bg-blue-400 animate-pulse',
  };
  const isActive = ['active', 'awaiting_approval', 'paused', 'initializing'].includes(status);
  return (
    <span className="relative flex h-2.5 w-2.5">
      {isActive && (
        <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', colors[status])} />
      )}
      <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', colors[status])} />
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    completed: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    failed: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    paused: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    awaiting_approval: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    aborted: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    timed_out: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    initializing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border', styles[status] || styles.active)}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

// ── Metric pill ────────────────────────────────────────────

function MetricPill({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
      <span className={cn('w-3.5 h-3.5 flex items-center justify-center', color)}>{icon}</span>
      <span className="font-mono">{value}</span>
      <span className="text-slate-600">{label}</span>
    </div>
  );
}

// ── Mission Card ───────────────────────────────────────────

function MissionCard({ session, agent, latestAudit, pendingApprovals, onClick }: {
  session: any;
  agent?: any;
  latestAudit?: any;
  pendingApprovals: number;
  onClick: () => void;
}) {
  const isActive = ['active', 'awaiting_approval', 'paused', 'initializing'].includes(session.status);
  const elapsed = session.startedAt
    ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
    : 0;
  const elapsedStr = elapsed > 3600
    ? `${Math.floor(elapsed / 3600)}h ${Math.floor((elapsed % 3600) / 60)}m`
    : elapsed > 60
    ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
    : `${elapsed}s`;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl p-4 transition-all group border',
        isActive
          ? 'bg-slate-900/90 border-cyan-500/30 hover:border-cyan-500/50 hover:bg-slate-800/90'
          : session.status === 'failed' || session.status === 'aborted'
          ? 'bg-rose-950/20 border-rose-900/30 hover:border-rose-800/50'
          : 'bg-slate-900/50 border-slate-800/50 hover:border-slate-700 hover:bg-slate-800/50'
      )}
    >
      {/* Top row: status, title, controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <StatusDot status={session.status} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200 font-mono truncate">
              {session.title || `Session ${session.id.slice(0, 8)}`}
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              {session.id.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={session.status} />
          {pendingApprovals > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
              {pendingApprovals} NEEDS YOU
            </span>
          )}
        </div>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-4 flex-wrap">
        {agent && (
          <MetricPill
            icon={<Cpu className="w-3 h-3" />}
            label={agent.identity?.name || agent.name || 'Agent'}
            value=""
          />
        )}
        {session.tokenUsage.totalTokens > 0 && (
          <MetricPill
            icon={<Zap className="w-3 h-3" />}
            value={session.tokenUsage.totalTokens.toLocaleString()}
            label="tokens"
          />
        )}
        {session.tokenUsage.estimatedCostUsd > 0 && (
          <MetricPill
            icon={<span className="text-[10px]">$</span>}
            value={session.tokenUsage.estimatedCostUsd.toFixed(4)}
            label="cost"
          />
        )}
        {isActive && (
          <MetricPill
            icon={<Clock className="w-3 h-3" />}
            value={elapsedStr}
            label="elapsed"
          />
        )}
      </div>

      {/* Latest activity hint */}
      {latestAudit && (
        <div className="mt-3 pt-3 border-t border-slate-800/50">
          <p className="text-[11px] text-slate-500 truncate">
            <span className="text-slate-600">Latest:</span>{' '}
            {latestAudit.eventType || latestAudit.action || 'activity'}
          </p>
        </div>
      )}
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────

export function MissionsPage() {
  const navigate = useNavigate();
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useSessions();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: approvals } = useApprovals();
  const { data: auditData } = useAuditLogs({ limit: 20 });

  const isLoading = sessionsLoading || tasksLoading || agentsLoading;

  const activeSessions = (sessions || []).filter(
    (s) => s.status === 'active' || s.status === 'awaiting_approval' || s.status === 'paused' || s.status === 'initializing'
  );
  const completedSessions = (sessions || []).filter((s) => s.status === 'completed');
  const failedSessions = (sessions || []).filter(
    (s) => s.status === 'failed' || s.status === 'aborted' || s.status === 'timed_out'
  );
  const pendingApprovals = (approvals || []).filter(
    (a) => a.status === 'pending' || a.status === 'PENDING'
  );

  // Build agent lookup
  const agentMap = new Map((agents || []).map((a) => [a.id, a]));
  // Build latest audit per session
  const auditRecords = auditData?.records || [];
  const latestAuditBySession = new Map<string, any>();
  for (const rec of auditRecords) {
    const sid = (rec.payload as any)?.sessionId || (rec.payload as any)?.session;
    if (sid && !latestAuditBySession.has(sid)) {
      latestAuditBySession.set(sid, rec);
    }
  }

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
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Command</h1>
            <p className="text-sm text-slate-400 mt-1">
              What are your agents doing right now?
            </p>
          </div>
        </div>
        <EmptyState
          icon={<Activity />}
          title="No missions"
          description="No active sessions detected in the SYNAPSE backend. Create a mission through the SYNAPSE API to begin."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Command</h1>
          <p className="text-sm text-slate-400 mt-1">
            {activeSessions.length} active · {completedSessions.length} completed · {failedSessions.length} failed
          </p>
        </div>
        <button
          onClick={() => refetchSessions()}
          className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Needs You — approvals pending */}
      {pendingApprovals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
              Needs You
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {pendingApprovals.length}
            </span>
          </div>
          <div className="space-y-2">
            {pendingApprovals.slice(0, 3).map((approval) => (
              <button
                key={approval.id}
                onClick={() => navigate('/approvals')}
                className="w-full text-left bg-amber-950/30 border border-amber-900/30 rounded-xl p-4 hover:border-amber-700/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-amber-200">{approval.toolName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {approval.riskLevel || 'MEDIUM'}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-600" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Missions */}
      {activeSessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Active Missions
          </h2>
          <div className="space-y-3">
            {activeSessions.map((session) => (
              <MissionCard
                key={session.id}
                session={session}
                agent={agentMap.get(session.agentId)}
                latestAudit={latestAuditBySession.get(session.id)}
                pendingApprovals={pendingApprovals.filter((a) => a.sessionId === session.id).length}
                onClick={() => navigate(`/missions/${session.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedSessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Completed
          </h2>
          <div className="space-y-2">
            {completedSessions.slice(0, 5).map((session) => (
              <MissionCard
                key={session.id}
                session={session}
                agent={agentMap.get(session.agentId)}
                pendingApprovals={0}
                onClick={() => navigate(`/missions/${session.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Failed */}
      {failedSessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-rose-400/80 uppercase tracking-wider mb-3">
            Failed / Aborted
          </h2>
          <div className="space-y-2">
            {failedSessions.map((session) => (
              <MissionCard
                key={session.id}
                session={session}
                agent={agentMap.get(session.agentId)}
                pendingApprovals={0}
                onClick={() => navigate(`/missions/${session.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
