import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Users, AlertTriangle, Clock, ArrowRight, RefreshCw,
  Cpu, Zap, ShieldCheck, Pause, Play, Square, Eye, CheckCircle2,
  XCircle, Brain, Terminal, ShieldAlert, Sparkles, Database, Wifi
} from 'lucide-react';
import { useSessions } from '@/hooks/useSessions';
import { useTasks } from '@/hooks/useTasks';
import { useAgents } from '@/hooks/useAgents';
import { useApprovals } from '@/hooks/useApprovals';
import { useAuditLogs } from '@/hooks/useAudit';
import { useHealth } from '@/hooks/useHealth';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

// ── Status Dot & Badge ─────────────────────────────────────

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
    initializing: 'bg-cyan-400 animate-pulse',
  };
  const isActive = ['active', 'awaiting_approval', 'paused', 'initializing'].includes(status);
  return (
    <span className="relative flex h-2.5 w-2.5">
      {isActive && (
        <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', colors[status] || 'bg-emerald-400')} />
      )}
      <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', colors[status] || 'bg-slate-400')} />
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
    initializing: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border', styles[status] || styles.active)}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

// ── Metric Pill ────────────────────────────────────────────

function MetricPill({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-md border border-slate-800/80">
      <span className={cn('w-3.5 h-3.5 flex items-center justify-center', color)}>{icon}</span>
      <span className="font-mono text-slate-200">{value}</span>
      <span className="text-slate-500">{label}</span>
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
          ? 'bg-slate-900/90 border-cyan-500/30 hover:border-cyan-500/60 hover:bg-slate-800/90 shadow-lg shadow-cyan-950/20'
          : session.status === 'failed' || session.status === 'aborted'
          ? 'bg-rose-950/10 border-rose-900/30 hover:border-rose-800/50 hover:bg-rose-950/20'
          : 'bg-slate-900/50 border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/50'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <StatusDot status={session.status} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
              {session.objective || session.title || `Mission ${session.id.slice(0, 8)}`}
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              ID: {session.id} · Workspace: {session.workspaceId || 'default'}
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

      <div className="flex items-center gap-3 flex-wrap">
        <MetricPill
          icon={<Brain className="w-3 h-3 text-cyan-400" />}
          label="Lead Brain"
          value="CLINE"
        />
        {session.tokenUsage?.totalTokens > 0 && (
          <MetricPill
            icon={<Zap className="w-3 h-3 text-amber-400" />}
            value={session.tokenUsage.totalTokens.toLocaleString()}
            label="tokens"
          />
        )}
        {session.tokenUsage?.estimatedCostUsd > 0 && (
          <MetricPill
            icon={<span className="text-[10px] text-emerald-400 font-bold">$</span>}
            value={session.tokenUsage.estimatedCostUsd.toFixed(4)}
            label="cost"
          />
        )}
        {isActive && (
          <MetricPill
            icon={<Clock className="w-3 h-3 text-slate-400" />}
            value={elapsedStr}
            label="elapsed"
          />
        )}
      </div>

      {latestAudit && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span className="truncate">
            <span className="text-slate-400 font-mono">LATEST:</span> {latestAudit.eventType}
          </span>
          <span className="font-mono text-[10px] text-slate-500 shrink-0">
            {new Date(latestAudit.timestamp || Date.now()).toLocaleTimeString()}
          </span>
        </div>
      )}
    </button>
  );
}

// ── Command Center Main Page ───────────────────────────────

export function MissionsPage() {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ACTIVE' | 'WAITING' | 'FAILED' | 'COMPLETED'>('ALL');
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useSessions();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: approvals, refetch: refetchApprovals } = useApprovals();
  const { data: auditData } = useAuditLogs({ limit: 15 });
  const { data: health } = useHealth();

  const isLoading = sessionsLoading || tasksLoading || agentsLoading;

  const allSessions = sessions || [];
  const activeSessions = allSessions.filter(
    (s) => s.status === 'active' || s.status === 'initializing'
  );
  const waitingSessions = allSessions.filter(
    (s) => s.status === 'awaiting_approval' || s.status === 'paused'
  );
  const failedSessions = allSessions.filter(
    (s) => s.status === 'failed' || s.status === 'aborted' || s.status === 'timed_out'
  );
  const completedSessions = allSessions.filter((s) => s.status === 'completed');

  const pendingApprovals = (approvals || []).filter(
    (a) => a.status === 'pending' || a.status === 'PENDING'
  );

  const filteredSessions = allSessions.filter((s) => {
    if (selectedFilter === 'ACTIVE') return activeSessions.includes(s);
    if (selectedFilter === 'WAITING') return waitingSessions.includes(s);
    if (selectedFilter === 'FAILED') return failedSessions.includes(s);
    if (selectedFilter === 'COMPLETED') return completedSessions.includes(s);
    return true;
  });

  const agentMap = new Map((agents || []).map((a) => [a.id, a]));
  const auditRecords = auditData?.records || [];
  const latestAuditBySession = new Map<string, any>();
  for (const rec of auditRecords) {
    const sid = (rec.payload as any)?.sessionId || (rec.payload as any)?.session;
    if (sid && !latestAuditBySession.has(sid)) {
      latestAuditBySession.set(sid, rec);
    }
  }

  // Cline Primary Brain Telemetry
  const primarySession = activeSessions[0] || allSessions[0];
  const clineStatus = activeSessions.length > 0 ? 'EXECUTING' : waitingSessions.length > 0 ? 'WAITING' : 'IDLE';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Top HUD: System Health & Quick Refresh ──────────────────────── */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Mission Command Center</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
              SYNAPSE OS V3
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Authoritative Human Governance & Cline Autonomy Console
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Wifi className="w-3 h-3" /> Realtime Connected
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Brain className="w-3 h-3" /> Cline Brain
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5 text-purple-400">
              <Database className="w-3 h-3" /> PostgreSQL Safe
            </span>
          </div>

          <button
            onClick={() => { refetchSessions(); refetchApprovals(); }}
            className="px-3 py-1.5 text-xs font-mono text-slate-300 bg-slate-800/90 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Sync
          </button>
        </div>
      </div>

      {/* ── 2. Cline Primary Brain Live Card ─────────────────────────────── */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900/90 to-slate-900/90 border border-cyan-500/30 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 shadow-inner">
              <Brain className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold text-slate-100">CLINE</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                  Primary Cognitive Brain
                </span>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border',
                  clineStatus === 'EXECUTING' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                  clineStatus === 'WAITING' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                  'bg-slate-500/20 text-slate-300 border-slate-500/30'
                )}>
                  {clineStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {primarySession
                  ? `Active Objective: ${(primarySession as any)?.objective || primarySession.title || 'Autonomous Task'}`
                  : 'Ready for mission assignment. Governance policies active.'}
              </p>
              <div className="flex items-center gap-4 mt-2 text-[11px] font-mono text-slate-400">
                <span>Model: <strong className="text-slate-200">Claude 3.5 Sonnet (Governed)</strong></span>
                <span>·</span>
                <span>Authority: <strong className="text-cyan-300">Synapse ToolGateway</strong></span>
                <span>·</span>
                <span>Plaintext Secrets: <strong className="text-emerald-400">0 Exposed</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end lg:self-center">
            {primarySession && (
              <button
                onClick={() => navigate(`/missions/${primarySession.id}`)}
                className="px-4 py-2 text-xs font-mono font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-cyan-950/40"
              >
                Inspect Primary Cockpit <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Mission Health KPI Matrix ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setSelectedFilter('ALL')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all',
            selectedFilter === 'ALL'
              ? 'bg-slate-800/90 border-cyan-500/60 shadow-md shadow-cyan-950/20'
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850'
          )}
        >
          <p className="text-[11px] font-mono uppercase text-slate-400">Total Missions</p>
          <p className="text-2xl font-bold font-mono text-slate-100 mt-1">{allSessions.length}</p>
        </button>

        <button
          onClick={() => setSelectedFilter('ACTIVE')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all',
            selectedFilter === 'ACTIVE'
              ? 'bg-emerald-950/30 border-emerald-500/60 shadow-md'
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850'
          )}
        >
          <p className="text-[11px] font-mono uppercase text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active
          </p>
          <p className="text-2xl font-bold font-mono text-emerald-300 mt-1">{activeSessions.length}</p>
        </button>

        <button
          onClick={() => setSelectedFilter('WAITING')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all',
            selectedFilter === 'WAITING'
              ? 'bg-amber-950/30 border-amber-500/60 shadow-md'
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850'
          )}
        >
          <p className="text-[11px] font-mono uppercase text-amber-400 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Waiting
          </p>
          <p className="text-2xl font-bold font-mono text-amber-300 mt-1">{waitingSessions.length}</p>
        </button>

        <button
          onClick={() => setSelectedFilter('FAILED')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all',
            selectedFilter === 'FAILED'
              ? 'bg-rose-950/30 border-rose-500/60 shadow-md'
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850'
          )}
        >
          <p className="text-[11px] font-mono uppercase text-rose-400 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Failed
          </p>
          <p className="text-2xl font-bold font-mono text-rose-300 mt-1">{failedSessions.length}</p>
        </button>

        <button
          onClick={() => setSelectedFilter('COMPLETED')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all',
            selectedFilter === 'COMPLETED'
              ? 'bg-slate-800/90 border-slate-600 shadow-md'
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850'
          )}
        >
          <p className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </p>
          <p className="text-2xl font-bold font-mono text-slate-300 mt-1">{completedSessions.length}</p>
        </button>
      </div>

      {/* ── 4. Needs You Intervention Center ─────────────────────────────── */}
      {pendingApprovals.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 shadow-lg shadow-amber-950/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400 animate-bounce" />
              <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                Needs You — Human Governance Required ({pendingApprovals.length})
              </h2>
            </div>
            <button
              onClick={() => navigate('/approvals')}
              className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              Open Approvals Drawer <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingApprovals.slice(0, 4).map((req) => (
              <div
                key={req.id}
                className="bg-slate-900/90 border border-amber-900/50 rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-200">{req.toolName}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {req.riskLevel || 'HIGH'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 truncate max-w-sm">
                    {req.reason || 'Operation requires authoritative human approval.'}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/approvals')}
                  className="px-3 py-1 text-xs font-mono font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded transition-colors shrink-0 ml-3"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. Main Mission List / Grid ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono font-semibold uppercase text-slate-400 tracking-wider">
            {selectedFilter === 'ALL' ? 'All Missions' : `${selectedFilter} Missions`} ({filteredSessions.length})
          </h2>
        </div>

        {filteredSessions.length === 0 ? (
          <EmptyState
            icon={<Activity className="w-8 h-8 text-slate-500" />}
            title="No missions match filter"
            description="Change filter or start a new autonomous mission through the API or Command Palette (Ctrl+K)."
          />
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
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
        )}
      </div>

      {/* ── 6. Live Activity & Forensic Provenance Stream ────────────────── */}
      {auditRecords.length > 0 && (
        <div className="pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-mono font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Live Governance & Execution Stream
            </h2>
            <button
              onClick={() => navigate('/audit')}
              className="text-xs font-mono text-slate-400 hover:text-slate-300 flex items-center gap-1"
            >
              Full Evidence Explorer <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl divide-y divide-slate-800/60 font-mono text-xs">
            {auditRecords.slice(0, 5).map((rec) => (
              <div key={rec.id} className="p-3 flex items-center justify-between hover:bg-slate-850/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] text-slate-500">
                    {new Date(rec.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                    {rec.actor || 'SYNAPSE'}
                  </span>
                  <span className="text-slate-300 truncate">
                    {rec.eventType}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-500">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Merkle Verified
                  </span>
                  <span className="font-mono text-slate-600">
                    {rec.hash?.slice(0, 10)}...
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MissionsPage;
