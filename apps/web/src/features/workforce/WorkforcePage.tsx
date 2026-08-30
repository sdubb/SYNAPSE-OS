import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowRight, RefreshCw } from 'lucide-react';
import { useAgents } from '@/hooks/useAgents';
import { useSessions } from '@/hooks/useSessions';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

function AgentCard({ agent, activeSession, onClick }: {
  agent: any;
  activeSession?: any;
  onClick: () => void;
}) {
  const isActive = activeSession && (activeSession.status === 'active' || activeSession.status === 'awaiting_approval');
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left bg-slate-900/80 border rounded-xl p-4 transition-all group',
        isActive ? 'border-emerald-500/30 hover:border-emerald-500/50' : 'border-slate-800 hover:border-slate-700'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold font-mono',
            isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
          )}>
            {(agent.identity?.name || agent.name || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">
              {agent.identity?.name || agent.name || 'Unknown Agent'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {agent.identity?.role || agent.role || 'general'} · {agent.model?.provider || 'unknown'}/{agent.model?.modelId || 'unknown'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isActive && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              ACTIVE
            </span>
          )}
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>
      {agent.identity?.description && (
        <p className="text-xs text-slate-500 mt-2 line-clamp-2">{agent.identity.description}</p>
      )}
      {activeSession && (
        <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-500 font-mono">
          <span>Session: {activeSession.id.slice(0, 8)}</span>
          <span>Tokens: {activeSession.tokenUsage?.totalTokens?.toLocaleString() || '0'}</span>
          <span>Cost: ${activeSession.tokenUsage?.estimatedCostUsd?.toFixed(4) || '0'}</span>
        </div>
      )}
    </button>
  );
}

export function WorkforcePage() {
  const navigate = useNavigate();
  const { data: agents, isLoading: agentsLoading, refetch } = useAgents();
  const { data: sessions, isLoading: sessionsLoading } = useSessions();

  const isLoading = agentsLoading || sessionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100">Workforce</h1>
          <button onClick={() => refetch()} className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        <EmptyState
          icon={<Users />}
          title="No active agents"
          description="No agents are registered in the SYNAPSE backend. Create an agent through the API to begin."
        />
      </div>
    );
  }

  // Map agents to their active sessions
  const sessionMap = new Map((sessions || []).map((s) => [s.agentId, s]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Workforce</h1>
          <p className="text-sm text-slate-400 mt-1">
            {agents.length} agent{agents.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button onClick={() => refetch()} className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className="space-y-3">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            activeSession={sessionMap.get(agent.id)}
            onClick={() => navigate(`/agents/${agent.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
