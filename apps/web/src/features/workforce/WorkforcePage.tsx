import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, RefreshCw, Brain, Activity, Clock, Zap, Cpu,
  ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2,
  XCircle, Filter, Search, Sparkles
} from 'lucide-react';
import { useAgents } from '@/hooks/useAgents';
import { useSessions } from '@/hooks/useSessions';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { AgentDefinition, SynapseSession } from '@/types';

// ────────────────────────────────────────────────────────────
// Kanban Columns Configuration
// ────────────────────────────────────────────────────────────

const KANBAN_COLUMNS = [
  { id: 'QUEUED', title: 'QUEUED', color: 'border-blue-500/40 text-blue-400' },
  { id: 'PLANNING', title: 'PLANNING', color: 'border-purple-500/40 text-purple-400' },
  { id: 'EXECUTING', title: 'EXECUTING', color: 'border-emerald-500/40 text-emerald-400' },
  { id: 'WAITING', title: 'WAITING', color: 'border-amber-500/40 text-amber-400' },
  { id: 'COMPLETED', title: 'COMPLETED', color: 'border-slate-500/40 text-slate-400' },
  { id: 'BLOCKED', title: 'BLOCKED', color: 'border-orange-500/40 text-orange-400' },
  { id: 'FAILED', title: 'FAILED', color: 'border-rose-500/40 text-rose-400' },
];

function AgentKanbanCard({
  agent,
  session,
  isCline,
  onClick
}: {
  agent: any;
  session?: SynapseSession;
  isCline: boolean;
  onClick: () => void;
}) {
  const tokenUsage = session?.tokenUsage || { totalTokens: 0, estimatedCostUsd: 0 };
  const role = agent.identity?.role || agent.role || 'Autonomous Subagent';
  const name = agent.identity?.name || agent.name || (isCline ? 'Cline (Lead)' : 'MCP Agent');
  const provider = agent.model?.provider || 'OpenRouter';
  const modelId = agent.model?.modelId || 'anthropic/claude-3.5-sonnet';

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3.5 rounded-xl border transition-all cursor-pointer group space-y-2.5',
        isCline
          ? 'bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border-purple-500/40 hover:border-purple-400 shadow-md shadow-purple-950/20'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
      )}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCline ? (
            <span className="p-1 rounded bg-purple-900/60 text-purple-300 border border-purple-500/30">
              <Brain className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span className="p-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
              <Cpu className="w-3.5 h-3.5" />
            </span>
          )}
          <span className="text-xs font-bold font-mono text-slate-100 truncate max-w-[120px]">
            {name}
          </span>
        </div>
        {isCline && (
          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-500/40">
            PRIMARY BRAIN
          </span>
        )}
      </div>

      {/* Role & Model */}
      <div className="text-[11px] text-slate-400 font-mono">
        <p className="text-slate-300 truncate">{role}</p>
        <p className="text-[10px] text-slate-500 truncate mt-0.5">{provider} / {modelId}</p>
      </div>

      {/* Metrics Footer */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span>Tokens: <span className="text-slate-200">{tokenUsage.totalTokens?.toLocaleString() || '0'}</span></span>
        <span>Cost: <span className="text-emerald-400">${tokenUsage.estimatedCostUsd?.toFixed(4) || '0.000'}</span></span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Workforce Kanban Page
// ────────────────────────────────────────────────────────────

export function WorkforcePage() {
  const navigate = useNavigate();
  const { data: agents, isLoading: agentsLoading, refetch: refetchAgents } = useAgents();
  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const [searchQuery, setSearchQuery] = useState('');

  const isLoading = agentsLoading || sessionsLoading;

  // Build Workforce Registry
  const workforceList = useMemo(() => {
    // Inject Cline as lead agent if not explicitly registered
    const baseList: any[] = agents && agents.length > 0 ? [...agents] : [];
    const hasCline = baseList.some((a) => a.identity?.name?.toLowerCase().includes('cline') || a.id?.includes('cline'));
    
    if (!hasCline) {
      baseList.unshift({
        id: 'cline-primary-lead',
        identity: {
          name: 'Cline (Lead)',
          role: 'Primary Reasoning & Cognitive Architecture',
          description: 'Autonomous cognitive brain driving mission strategy, planning, and tool dispatch.',
        },
        model: {
          provider: 'OpenRouter',
          modelId: 'anthropic/claude-3.5-sonnet',
        },
        status: 'EXECUTING',
      });
    }
    return baseList;
  }, [agents]);

  // Group into Kanban columns
  const kanbanState = useMemo(() => {
    const cols: Record<string, any[]> = {};
    for (const c of KANBAN_COLUMNS) cols[c.id] = [];

    for (const agt of workforceList) {
      const isCline = agt.id === 'cline-primary-lead' || agt.identity?.name?.toLowerCase().includes('cline');
      // Assign column based on session or status
      const colId = isCline ? 'EXECUTING' : (agt.status || 'PLANNING');
      if (cols[colId]) {
        cols[colId].push(agt);
      } else {
        cols['PLANNING'].push(agt);
      }
    }
    return cols;
  }, [workforceList]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── TOP BANNER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-slate-100 tracking-tight">
              WORKFORCE COMMAND KANBAN
            </h1>
            <Badge variant="purple" hasDot>
              {workforceList.length} ACTIVE AGENTS
            </Badge>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Real-time multi-agent lifecycle distribution. Cline operates as Primary Cognitive Engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-cyan-500 font-mono w-48"
            />
          </div>
          <button
            onClick={() => refetchAgents()}
            className="px-3 py-1.5 text-xs font-mono font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ── KANBAN BOARD ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => {
          const agentsInCol = kanbanState[col.id] || [];
          return (
            <div
              key={col.id}
              className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col min-w-[200px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <span className={cn('text-xs font-bold font-mono uppercase tracking-wider', col.color)}>
                  {col.title}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  {agentsInCol.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {agentsInCol.length === 0 ? (
                  <div className="h-28 border border-dashed border-slate-800/60 rounded-lg flex items-center justify-center text-[10px] font-mono text-slate-600">
                    No agents
                  </div>
                ) : (
                  agentsInCol.map((agt) => {
                    const isCline = agt.id === 'cline-primary-lead' || agt.identity?.name?.toLowerCase().includes('cline');
                    return (
                      <AgentKanbanCard
                        key={agt.id}
                        agent={agt}
                        isCline={isCline}
                        onClick={() => navigate('/missions')}
                      />
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WorkforcePage;
