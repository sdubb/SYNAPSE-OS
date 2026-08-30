import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, Cpu, Zap, Shield, Pause, Play, Square,
  AlertTriangle, CheckCircle2, XCircle, Activity, FileText,
  Eye, GitBranch, Users, ChevronRight, ChevronDown,
  ShieldCheck, ShieldAlert, RefreshCw, Terminal,
  Hash, Loader2,
} from 'lucide-react';
import { useSession } from '@/hooks/useSessions';
import { useTasks } from '@/hooks/useTasks';
import { useAgents } from '@/hooks/useAgents';
import { useApprovals } from '@/hooks/useApprovals';
import { useAuditLogs } from '@/hooks/useAudit';
import { useSessionTimeline, useMissionStats } from '@/hooks/useSessionTimeline';
import { apiClient } from '@/api/client';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabTrigger, TabContent } from '@/components/ui/Tabs';
import { cn, formatRelativeTime, formatDuration } from '@/lib/utils';
import type { SynapseSession, ToolApprovalRequest, AuditRecord } from '@/types';

// ─── Status Helpers ────────────────────────────────────────

function StatusDot({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-400', completed: 'bg-slate-400', failed: 'bg-rose-400',
    paused: 'bg-amber-400', cancelled: 'bg-zinc-500', awaiting_approval: 'bg-amber-400',
    aborted: 'bg-rose-400', timed_out: 'bg-rose-400', initializing: 'bg-blue-400',
  };
  const sizes = { sm: 'h-2 w-2', md: 'h-2.5 w-2.5', lg: 'h-3.5 w-3.5' };
  const isActive = ['active', 'awaiting_approval', 'paused', 'initializing'].includes(status);
  return (
    <span className="relative flex shrink-0">
      {isActive && (
        <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', colors[status], sizes[size])} />
      )}
      <span className={cn('relative inline-flex rounded-full', sizes[size], colors[status])} />
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, 'emerald' | 'rose' | 'amber' | 'blue' | 'default'> = {
    active: 'emerald', completed: 'default', failed: 'rose', paused: 'amber',
    awaiting_approval: 'amber', aborted: 'rose', timed_out: 'rose', initializing: 'blue',
  };
  return (
    <Badge variant={variantMap[status] || 'default'} hasDot pulse={['active', 'awaiting_approval', 'initializing'].includes(status)}>
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  );
}

// ─── Timeline Event Renderer ───────────────────────────────

function TimelineEventItem({ event }: { event: any }) {
  const [expanded, setExpanded] = useState(false);
  const catIcons: Record<string, React.ReactNode> = {
    tool: <Terminal className="w-3.5 h-3.5" />,
    governance: <Shield className="w-3.5 h-3.5" />,
    observation: <Eye className="w-3.5 h-3.5" />,
    simulation: <GitBranch className="w-3.5 h-3.5" />,
    agent: <Users className="w-3.5 h-3.5" />,
    graph: <GitBranch className="w-3.5 h-3.5" />,
    error: <XCircle className="w-3.5 h-3.5" />,
    system: <Activity className="w-3.5 h-3.5" />,
  };
  const sevColors: Record<string, string> = {
    info: 'text-slate-400 border-slate-800',
    success: 'text-emerald-400 border-emerald-900/40',
    warning: 'text-amber-400 border-amber-900/40',
    error: 'text-rose-400 border-rose-900/40',
  };
  const color = sevColors[event.severity || 'info'];
  const catColor = event.category === 'error' ? 'text-rose-400' :
    event.category === 'governance' ? 'text-amber-400' :
    event.category === 'tool' ? 'text-cyan-400' :
    event.category === 'agent' ? 'text-purple-400' :
    'text-slate-400';

  return (
    <div className={cn('group flex gap-3 p-3 rounded-lg border transition-colors hover:bg-slate-900/50', color)}>
      {/* Timeline connector */}
      <div className="flex flex-col items-center shrink-0">
        <div className={cn('w-7 h-7 rounded-full border flex items-center justify-center', catColor, color)}>
          {catIcons[event.category] || catIcons.system}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-slate-200 font-medium leading-relaxed">{event.summary}</p>
          <span className="text-[10px] text-slate-500 font-mono shrink-0">{formatRelativeTime(event.timestamp)}</span>
        </div>

        {/* Event type + details toggle */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-mono text-slate-500">{event.type}</span>
          {event.agentId && (
            <span className="text-[10px] font-mono text-slate-600">agent:{event.agentId.slice(0, 8)}</span>
          )}
          {event.evidenceId && (
            <span className="text-[10px] font-mono text-slate-600">evidence:{event.evidenceId.slice(0, 8)}</span>
          )}
          {Object.keys(event.details || {}).length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5"
            >
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              details
            </button>
          )}
        </div>

        {/* Expanded details */}
        {expanded && (
          <pre className="mt-2 p-2 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-400 font-mono overflow-x-auto max-h-48 overflow-y-auto">
            {JSON.stringify(event.details, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// ─── Attention Banner ──────────────────────────────────────

function AttentionBanner({ approvals, onNavigate }: {
  approvals: ToolApprovalRequest[];
  onNavigate: (path: string) => void;
}) {
  if (approvals.length === 0) return null;
  return (
    <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-300">
              {approvals.length} approval{approvals.length !== 1 ? 's' : ''} awaiting decision
            </p>
            <p className="text-xs text-amber-400/60 mt-0.5">Agent is waiting for human authorization</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => onNavigate('/approvals')}>
          Review <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Mission Stats Bar ─────────────────────────────────────

function MissionStatsBar({ session, stats }: { session: SynapseSession; stats: ReturnType<typeof useMissionStats> }) {
  const elapsed = session.startedAt
    ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
    : 0;

  const items = [
    { label: 'Events', value: stats.totalEvents, icon: <Activity className="w-3 h-3" /> },
    { label: 'Tool Calls', value: stats.toolCalls, icon: <Terminal className="w-3 h-3" />, sub: stats.toolBlocked > 0 ? `${stats.toolBlocked} blocked` : undefined },
    { label: 'Governance', value: stats.governanceDecisions, icon: <Shield className="w-3 h-3" /> },
    { label: 'Errors', value: stats.errors, icon: <XCircle className="w-3 h-3" />, highlight: stats.errors > 0 },
    { label: 'Tokens', value: session.tokenUsage.totalTokens.toLocaleString(), icon: <Zap className="w-3 h-3" /> },
    { label: 'Cost', value: `$${session.tokenUsage.estimatedCostUsd.toFixed(4)}`, icon: <span className="text-[10px]">$</span> },
    { label: 'Elapsed', value: formatDuration(elapsed), icon: <Clock className="w-3 h-3" /> },
  ];

  return (
    <div className="grid grid-cols-7 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'bg-slate-900/60 border rounded-lg p-2.5 text-center',
            item.highlight ? 'border-rose-900/40' : 'border-slate-800/60'
          )}
        >
          <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
            {item.icon}
            <span className="text-[10px] uppercase tracking-wider font-medium">{item.label}</span>
          </div>
          <p className={cn('text-sm font-bold font-mono', item.highlight ? 'text-rose-400' : 'text-slate-100')}>
            {item.value}
          </p>
          {item.sub && <p className="text-[10px] text-amber-400/70 mt-0.5">{item.sub}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Governance Tab ────────────────────────────────────────

function GovernanceTab({ approvals, sessionId }: { approvals: ToolApprovalRequest[]; sessionId: string }) {
  const [resolving, setResolving] = useState<string | null>(null);

  const sessionApprovals = approvals.filter((a) => a.sessionId === sessionId);
  const pending = sessionApprovals.filter((a) => a.status === 'pending' || a.status === 'PENDING');
  const resolved = sessionApprovals.filter((a) => a.status !== 'pending' && a.status !== 'PENDING');

  const handleResolve = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    setResolving(id);
    try {
      await apiClient.resolveApproval(id, decision);
    } catch (err) {
      console.error('Approval resolution failed:', err);
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="space-y-4">
      {pending.length === 0 && resolved.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck />}
          title="No governance events"
          description="No approvals or policy decisions for this mission."
        />
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5" /> Pending Approvals ({pending.length})
              </h3>
              <div className="space-y-2">
                {pending.map((a) => (
                  <div key={a.id} className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-amber-200">{a.toolName}</span>
                          <Badge variant="amber" size="xs">{a.riskLevel}</Badge>
                        </div>
                        {a.reason && <p className="text-xs text-amber-400/70">{a.reason}</p>}
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                          <span>call:{a.callId.slice(0, 8)}</span>
                          <span>{formatRelativeTime(a.createdAt)}</span>
                          {a.expiresAt && <span>expires:{new Date(a.expiresAt).toLocaleTimeString()}</span>}
                        </div>
                        {Object.keys(a.toolParameters).length > 0 && (
                          <pre className="mt-2 p-2 bg-slate-950 border border-slate-800 rounded text-[10px] text-slate-400 font-mono max-h-24 overflow-y-auto">
                            {JSON.stringify(a.toolParameters, null, 2)}
                          </pre>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="success"
                          size="xs"
                          isLoading={resolving === a.id}
                          onClick={() => handleResolve(a.id, 'APPROVED')}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="xs"
                          isLoading={resolving === a.id}
                          onClick={() => handleResolve(a.id, 'REJECTED')}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Resolved</h3>
              <div className="space-y-1">
                {resolved.slice(0, 10).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-2 px-3 rounded bg-slate-900/30 text-xs">
                    <span className={cn(
                      a.status === 'APPROVED' || a.status === 'approved' ? 'text-emerald-400' : 'text-rose-400'
                    )}>
                      {a.status === 'APPROVED' || a.status === 'approved' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    </span>
                    <span className="font-mono text-slate-300">{a.toolName}</span>
                    <span className="text-slate-500">{formatRelativeTime(a.resolvedAt || a.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Evidence Tab ──────────────────────────────────────────

function EvidenceTab({ sessionId }: { sessionId: string }) {
  const { data: auditData, isLoading } = useAuditLogs({ limit: 50 });
  const records = (auditData?.records || []).filter(
    (r: AuditRecord) => r.mission === sessionId || (r.payload as any)?.sessionId === sessionId
  );

  if (isLoading) return <Skeleton className="h-32" />;

  return (
    <div className="space-y-3">
      {records.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No audit records"
          description="No evidence has been recorded for this mission yet."
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Audit Trail ({records.length} records)
            </h3>
            <Badge variant="cyan" size="xs">SHA-256 Chain</Badge>
          </div>
          <div className="space-y-1">
            {records.map((rec: AuditRecord) => (
              <AuditRecordRow key={rec.id} record={rec} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AuditRecordRow({ record }: { record: AuditRecord }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-slate-800/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 py-2.5 px-3 hover:bg-slate-900/50 transition-colors text-left"
      >
        <span className={cn(
          'w-2 h-2 rounded-full shrink-0',
          record.eventType.includes('security') ? 'bg-rose-400' :
          record.eventType.includes('approval') ? 'bg-amber-400' :
          record.eventType.includes('tool') ? 'bg-cyan-400' :
          'bg-slate-400'
        )} />
        <span className="text-xs font-mono text-slate-300 flex-1 min-w-0 truncate">{record.eventType}</span>
        {record.tool && <span className="text-[10px] font-mono text-slate-500">{record.tool}</span>}
        {record.result && <Badge variant={record.result === 'success' ? 'emerald' : 'rose'} size="xs">{record.result}</Badge>}
        <span className="text-[10px] font-mono text-slate-600">{formatRelativeTime(record.timestamp)}</span>
        {expanded ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-800/30">
          <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] font-mono">
            <div><span className="text-slate-500">Event ID: </span><span className="text-slate-300">{record.eventId}</span></div>
            <div><span className="text-slate-500">Sequence: </span><span className="text-slate-300">{record.sequence}</span></div>
            <div><span className="text-slate-500">Actor: </span><span className="text-slate-300">{record.actor}</span></div>
            <div><span className="text-slate-500">Graph V: </span><span className="text-slate-300">{record.graphVersion ?? '—'}</span></div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <Hash className="w-3 h-3 text-slate-600" />
            <span className="text-slate-500">Hash: </span>
            <span className="text-slate-500 truncate">{record.hash.slice(0, 32)}…</span>
          </div>
          {Object.keys(record.payload || {}).length > 0 && (
            <pre className="p-2 bg-slate-950 border border-slate-800 rounded text-[10px] text-slate-400 font-mono max-h-32 overflow-y-auto">
              {JSON.stringify(record.payload, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────

function OverviewTab({ session, agent, tasks }: {
  session: SynapseSession;
  agent?: any;
  tasks: any[];
}) {
  const relatedTasks = tasks.filter((t) => t.missionId === session.taskId || t.id === session.taskId);

  return (
    <div className="space-y-4">
      {/* Session Identity */}
      <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Mission Identity</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
          {[
            ['Session', session.id],
            ['Agent', session.agentId],
            ['Workspace', session.workspaceId],
            ['Runtime', session.runtimeId],
            ['Cline Session', session.clineSessionId],
            ['Started', session.startedAt ? new Date(session.startedAt).toLocaleString() : '—'],
            ['Created', new Date(session.createdAt).toLocaleString()],
            ['Updated', new Date(session.updatedAt).toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-800/30 last:border-0">
              <span className="text-slate-500 uppercase tracking-wider">{label}</span>
              <span className="font-mono text-slate-200 truncate ml-4" title={String(value)}>{String(value || '—').slice(0, 24)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Info */}
      {agent && (
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5" /> Agent
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-200">{agent.identity?.name || agent.name || 'Unknown'}</span>
              {agent.model && <Badge variant="cyan" size="xs">{agent.model.provider}/{agent.model.modelId}</Badge>}
            </div>
            {agent.identity?.description && (
              <p className="text-xs text-slate-400 leading-relaxed">{agent.identity.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Token Usage */}
      <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" /> Token Usage
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xl font-bold text-slate-100 font-mono">{session.tokenUsage.promptTokens.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Prompt</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-slate-100 font-mono">{session.tokenUsage.completionTokens.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Completion</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-cyan-400 font-mono">${session.tokenUsage.estimatedCostUsd.toFixed(4)}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Cost</p>
          </div>
        </div>
        {/* Token bar visualization */}
        {session.tokenUsage.totalTokens > 0 && (
          <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
              style={{ width: `${Math.min((session.tokenUsage.promptTokens / session.tokenUsage.totalTokens) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Runtime */}
      {session.runtimeMetadata && (
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" /> Runtime
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Mode</span><span className="font-mono text-slate-200">{session.runtimeMetadata.hostMode}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Working Dir</span><span className="font-mono text-slate-200 truncate ml-2" title={session.runtimeMetadata.workingDirectory}>{session.runtimeMetadata.workingDirectory.split(/[/\\]/).pop()}</span></div>
            {session.runtimeMetadata.osPlatform && <div className="flex justify-between"><span className="text-slate-500">Platform</span><span className="font-mono text-slate-200">{session.runtimeMetadata.osPlatform}</span></div>}
            {session.runtimeMetadata.nodeVersion && <div className="flex justify-between"><span className="text-slate-500">Node</span><span className="font-mono text-slate-200">{session.runtimeMetadata.nodeVersion}</span></div>}
            {session.runtimeMetadata.gitBranch && <div className="flex justify-between"><span className="text-slate-500">Git Branch</span><span className="font-mono text-slate-200">{session.runtimeMetadata.gitBranch}</span></div>}
          </div>
        </div>
      )}

      {/* Related Tasks */}
      {relatedTasks.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tasks</h3>
          <div className="space-y-2">
            {relatedTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2 px-3 rounded bg-slate-950/50 text-xs">
                <StatusDot status={t.status} size="sm" />
                <span className="text-slate-200 font-medium truncate">{t.title || t.objective || t.id.slice(0, 12)}</span>
                <Badge variant="default" size="xs">{t.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Timeline Tab ──────────────────────────────────────────

function TimelineTab({ events, isLoading }: { events: any[]; isLoading: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll on new events
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Activity />}
        title="No timeline events"
        description="No events recorded for this mission yet. Events appear in real-time as agents work."
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500 font-mono">{events.length} events</span>
        <button
          onClick={() => { setAutoScroll(true); scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight); }}
          className={cn(
            'text-[10px] px-2 py-1 rounded transition-colors',
            autoScroll ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          )}
        >
          {autoScroll ? '● LIVE' : '○ LIVE OFF'}
        </button>
      </div>
      <div ref={scrollRef} onScroll={handleScroll} className="max-h-[60vh] overflow-y-auto space-y-1 pr-1">
        {events.map((event: any) => (
          <TimelineEventItem key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Mission Detail Page ──────────────────────────────

export function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('timeline');

  const { data: session, isLoading: sessionLoading, error: sessionError, refetch } = useSession(id);
  const { data: tasks } = useTasks();
  const { data: agents } = useAgents();
  const { data: approvals } = useApprovals();
  const { events: timelineEvents, isLoading: timelineLoading } = useSessionTimeline(id);

  const stats = useMissionStats(timelineEvents);
  const agent = useMemo(() => {
    if (!session || !agents) return undefined;
    return agents.find((a) => a.id === session.agentId);
  }, [session, agents]);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = useCallback(async (action: 'pause' | 'resume' | 'stop') => {
    if (!id) return;
    setActionLoading(action);
    try {
      if (action === 'pause') await apiClient.pauseSession(id);
      else if (action === 'resume') await apiClient.resumeSession(id);
      else if (action === 'stop') await apiClient.stopSession(id);
      await refetch();
    } catch (err) {
      console.error(`Action ${action} failed:`, err);
    } finally {
      setActionLoading(null);
    }
  }, [id, refetch]);

  // Loading
  if (sessionLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Error
  if (sessionError || !session) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/missions')} className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="p-6 bg-rose-950/30 border border-rose-900/50 rounded-xl text-rose-300 text-sm">
          {sessionError?.message || 'Session not found. This resource may not exist in the backend.'}
        </div>
      </div>
    );
  }

  const isActive = ['active', 'awaiting_approval', 'paused', 'initializing'].includes(session.status);
  const pendingApprovals = (approvals || []).filter(
    (a) => (a.status === 'pending' || a.status === 'PENDING') && a.sessionId === session.id
  );

  const tabItems = [
    { id: 'timeline', label: 'Timeline', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'overview', label: 'Overview', icon: <Eye className="w-3.5 h-3.5" /> },
    { id: 'governance', label: 'Governance', icon: <Shield className="w-3.5 h-3.5" />,
      badge: pendingApprovals.length > 0 ? pendingApprovals.length : undefined },
    { id: 'evidence', label: 'Evidence', icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => navigate('/missions')} className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Mission Command
      </button>

      {/* ── MISSION HEADER ────────────────────────────── */}
      <div className={cn(
        'bg-slate-900/80 border rounded-xl p-5',
        isActive ? 'border-cyan-500/30' : session.status === 'failed' ? 'border-rose-900/40' : 'border-slate-800'
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <StatusDot status={session.status} size="lg" />
            <div>
              <h1 className="text-lg font-bold text-slate-100 font-mono">
                {session.title || `Session ${session.id.slice(0, 8)}`}
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{session.id}</p>
            </div>
            <StatusBadge status={session.status} />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {session.status === 'active' && (
              <>
                <Button variant="outline" size="xs" isLoading={actionLoading === 'pause'} onClick={() => handleAction('pause')} leftIcon={<Pause className="w-3 h-3" />}>
                  Pause
                </Button>
                <Button variant="danger" size="xs" isLoading={actionLoading === 'stop'} onClick={() => handleAction('stop')} leftIcon={<Square className="w-3 h-3" />}>
                  Stop
                </Button>
              </>
            )}
            {session.status === 'paused' && (
              <Button variant="success" size="xs" isLoading={actionLoading === 'resume'} onClick={() => handleAction('resume')} leftIcon={<Play className="w-3 h-3" />}>
                Resume
              </Button>
            )}
            <Button variant="ghost" size="xs" onClick={() => refetch()} leftIcon={<RefreshCw className="w-3 h-3" />}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ── ATTENTION BANNER ──────────────────────────── */}
      <AttentionBanner approvals={pendingApprovals} onNavigate={navigate} />

      {/* ── STATS BAR ─────────────────────────────────── */}
      <MissionStatsBar session={session} stats={stats} />

      {/* ── TABS ──────────────────────────────────────── */}
      <div className="border border-slate-800/60 rounded-xl bg-slate-900/40 overflow-hidden">
        <div className="border-b border-slate-800/60 px-4 pt-2">
          <Tabs variant="underline" activeTab={activeTab} onChange={setActiveTab}>
            {tabItems.map((tab) => (
              <TabTrigger key={tab.id} value={tab.id} icon={tab.icon} badge={tab.badge}>
                {tab.label}
              </TabTrigger>
            ))}
          </Tabs>
        </div>

        <div className="p-4">
          <TabContent value="timeline">
            <TimelineTab events={timelineEvents} isLoading={timelineLoading} />
          </TabContent>
          <TabContent value="overview">
            <OverviewTab session={session} agent={agent} tasks={tasks || []} />
          </TabContent>
          <TabContent value="governance">
            <GovernanceTab approvals={approvals || []} sessionId={session.id} />
          </TabContent>
          <TabContent value="evidence">
            <EvidenceTab sessionId={session.id} />
          </TabContent>
        </div>
      </div>
    </div>
  );
}
