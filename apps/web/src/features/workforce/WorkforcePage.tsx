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
    const baseList: any[] = agents && agents.length > 0 ? [...agents] : [];
    const hasCline = baseList.some((a) => a.identity?.name?.toLowerCase().includes('cline') || a.id?.includes('cline'));
    
    if (!hasCline) {
      baseList.unshift({
        id: 'cline-primary-lead',
        identity: {
          name: 'Cline (Lead Brain)',
          role: 'Primary Reasoning & Cognitive Architecture',
          description: 'Autonomous cognitive brain driving mission strategy, DAG task planning, and tool dispatch.',
        },
        model: {
          provider: 'OpenRouter',
          modelId: 'anthropic/claude-3.5-sonnet',
        },
        status: 'ACTIVE',
      });
    }

    // Add standard worker subagents if only Cline exists
    if (baseList.length === 1) {
      baseList.push(
        {
          id: 'subagent_code_fixer',
          identity: {
            name: 'Code Fixer Subagent',
            role: 'Surgical Patch Specialist',
            description: 'Executes file edits, refactoring, and AST modifications under ToolGateway policies.',
          },
          model: { provider: 'OpenRouter', modelId: 'anthropic/claude-3.5-sonnet' },
          status: 'IDLE',
        },
        {
          id: 'subagent_security_auditor',
          identity: {
            name: 'Security Auditor Subagent',
            role: 'Vulnerability Scanner',
            description: 'Scans routes, middleware, and dependencies for secret leakage and auth bypasses.',
          },
          model: { provider: 'OpenRouter', modelId: 'anthropic/claude-3.5-sonnet' },
          status: 'IDLE',
        },
        {
          id: 'subagent_test_verifier',
          identity: {
            name: 'Test Verifier Subagent',
            role: 'Acceptance Verification Worker',
            description: 'Constructs realistic test fixtures and verifies 100% passing test assertions.',
          },
          model: { provider: 'OpenRouter', modelId: 'anthropic/claude-3.5-sonnet' },
          status: 'IDLE',
        }
      );
    }
    return baseList;
  }, [agents]);

  const clineAgent = workforceList.find((a) => a.id === 'cline-primary-lead' || a.identity?.name?.toLowerCase().includes('cline'));
  const workerAgents = workforceList.filter((a) => a !== clineAgent);

  const filteredWorkers = useMemo(() => {
    if (!searchQuery.trim()) return workerAgents;
    const q = searchQuery.toLowerCase();
    return workerAgents.filter(
      (w) =>
        w.identity?.name?.toLowerCase().includes(q) ||
        w.identity?.role?.toLowerCase().includes(q) ||
        w.id?.toLowerCase().includes(q)
    );
  }, [workerAgents, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-slate-100 tracking-tight">
              WORKFORCE & AGENT ARCHITECTURE
            </h1>
            <Badge variant="purple" hasDot>
              1 LEAD + {workerAgents.length} WORKERS
            </Badge>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Cline operates as the Primary Cognitive Brain. Specialized subagents execute subordinate parallel tasks under Cline's coordination.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search workers..."
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

      {/* ── 1. CLINE • PRIMARY COGNITIVE BRAIN ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <h2 className="text-xs font-bold font-mono text-purple-300 uppercase tracking-wider">
            Primary Cognitive Brain (Authoritative Lead)
          </h2>
        </div>

        {clineAgent && (
          <div className="p-6 bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/40 rounded-xl shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-purple-900/60 text-purple-200 border border-purple-500/40">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold font-mono text-slate-100">
                      {clineAgent.identity?.name || 'Cline Lead Brain'}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-500/40">
                      PRIMARY REASONING
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      ● ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {clineAgent.identity?.description || 'Autonomous cognitive brain driving mission strategy, DAG planning, and tool dispatch.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-400 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 block">MODEL</span>
                  <span className="text-slate-200 font-bold">{clineAgent.model?.provider || 'OpenRouter'} / {clineAgent.model?.modelId?.split('/')[1] || 'claude-3.5-sonnet'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">AUTHORITY</span>
                  <span className="text-purple-300 font-bold">DAG Orchestrator</span>
                </div>
              </div>
            </div>

            {/* Core Responsibilities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-purple-900/30 text-xs font-mono">
              <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <span className="text-purple-400 font-bold block">1. INTENT DECOMPOSITION</span>
                <span className="text-slate-400 text-[11px]">Deconstructs user goals into DAG milestones</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <span className="text-purple-400 font-bold block">2. TOOL DISPATCH</span>
                <span className="text-slate-400 text-[11px]">Requests governed actions via ToolGateway</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <span className="text-purple-400 font-bold block">3. OCC REPLANNING</span>
                <span className="text-slate-400 text-[11px]">Adapts plans autonomously upon error observation</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <span className="text-purple-400 font-bold block">4. WORKER DELEGATION</span>
                <span className="text-slate-400 text-[11px]">Coordinates specialized worker subagents</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. SUBORDINATE WORKER SUBAGENTS ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold font-mono text-cyan-300 uppercase tracking-wider">
              Specialized Worker Subagents ({filteredWorkers.length})
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Workers operate strictly within tool boundaries assigned by Cline
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredWorkers.map((worker) => (
            <div
              key={worker.id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-slate-800 text-cyan-400 border border-slate-700">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-mono text-slate-100">{worker.identity?.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{worker.identity?.role}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {worker.status || 'IDLE'}
                </span>
              </div>

              <p className="text-xs text-slate-300">
                {worker.identity?.description}
              </p>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Model: <span className="text-slate-300">{worker.model?.modelId?.split('/')[1] || 'claude-3.5-sonnet'}</span></span>
                <span>Type: <span className="text-cyan-400">Subordinate</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. CUSTOM AGENT BUILDER ROADMAP ── */}
      <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
            Custom Agent Builder (Future Capability)
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Currently, specialized subagents are configured at the backend registry level or spawned dynamically by Cline during complex missions. An interactive Visual Agent Builder for constructing custom subagents with bespoke system prompts and RBAC tool scopes is scheduled for a future release.
        </p>
      </div>
    </div>
  );
}

export default WorkforcePage;
