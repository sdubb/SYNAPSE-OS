import React from 'react';
import { FlaskConical, RefreshCw } from 'lucide-react';
import { useSimulations } from '@/hooks/useSimulations';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

function SimulationCard({ sim }: { sim: any }) {
  const statusColors: Record<string, string> = {
    running: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    completed: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    failed: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    draft: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-200 font-mono">{sim.name || sim.id?.slice(0, 8) || 'Unknown'}</p>
          <p className="text-xs text-slate-500 mt-0.5">Scenario: {sim.scenarioId?.slice(0, 8) || '—'}</p>
        </div>
        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border', statusColors[sim.status] || statusColors.draft)}>
          {sim.status?.toUpperCase()}
        </span>
      </div>
      {sim.comparativeResult && (
        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px]">RISK DELTA</span>
            <span className="text-slate-200 font-mono">{sim.comparativeResult.riskScoreDelta}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">RECOMMENDATION</span>
            <span className={cn(
              'font-mono font-bold',
              sim.comparativeResult.recommendation === 'PROCEED' ? 'text-emerald-400' :
              sim.comparativeResult.recommendation === 'ABORT' ? 'text-rose-400' : 'text-amber-400'
            )}>{sim.comparativeResult.recommendation}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">VIOLATIONS</span>
            <span className="text-slate-200 font-mono">{sim.comparativeResult.criticalViolations?.length || 0}</span>
          </div>
        </div>
      )}
      <div className="mt-2 text-[10px] text-slate-600 font-mono">
        Created: {sim.createdAt ? new Date(sim.createdAt).toLocaleString() : '—'}
      </div>
    </div>
  );
}

export function SimulationPage() {
  const { data: simulations, isLoading, refetch } = useSimulations();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      </div>
    );
  }

  if (!simulations || simulations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100">Simulation</h1>
          <button onClick={() => refetch()} className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        <EmptyState
          icon={<FlaskConical />}
          title="No simulations"
          description="No simulation runs found in the SYNAPSE backend."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Simulation</h1>
          <p className="text-sm text-slate-400 mt-1">{simulations.length} simulation run{simulations.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => refetch()} className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>
      <div className="space-y-3">
        {simulations.map((sim) => <SimulationCard key={sim.id} sim={sim} />)}
      </div>
    </div>
  );
}
