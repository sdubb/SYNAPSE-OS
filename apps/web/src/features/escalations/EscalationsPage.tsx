import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useRealtime } from '@/realtime/WSConnectionProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type { EscalationRequest, SynapseRealtimeEvent } from '@/types';

const levelColors: Record<string, string> = {
  LEVEL_1: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  LEVEL_2: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  LEVEL_3: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  LEVEL_4: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  RESOLVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  REJECTED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

export function EscalationsPage() {
  const { subscribe, connected } = useRealtime();
  const [escalations, setEscalations] = useState<EscalationRequest[]>([]);

  useEffect(() => {
    const unsub = subscribe('graph.escalation.required', (evt: SynapseRealtimeEvent) => {
      if (evt.payload?.escalation) {
        setEscalations((prev) => {
          const esc = evt.payload.escalation as EscalationRequest;
          const exists = prev.some((e) => e.id === esc.id);
          if (exists) return prev;
          return [esc, ...prev];
        });
      }
    });
    return unsub;
  }, [subscribe]);

  const pending = escalations.filter((e) => e.status === 'PENDING');
  const resolved = escalations.filter((e) => e.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Escalations</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time escalation events from the SYNAPSE graph engine.
            {!connected && (
              <span className="text-amber-400 ml-2">⚠ Disconnected</span>
            )}
          </p>
        </div>
      </div>

      {escalations.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle />}
          title="No escalations"
          description="No escalation requests have been received. Escalations appear here when the graph engine requires human intervention."
        />
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-400/80 uppercase tracking-wider mb-3">
                Pending ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((esc) => (
                  <div key={esc.id} className="bg-slate-900/80 border border-amber-900/30 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border', levelColors[esc.level])}>
                          {esc.level}
                        </span>
                        <span className="text-sm font-mono text-slate-200">Node: {esc.nodeId}</span>
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono">{esc.id.slice(0, 8)}</span>
                    </div>
                    <p className="text-xs text-slate-400 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 mb-2">
                      {esc.reason}
                    </p>
                    <div className="text-[10px] text-slate-600 font-mono">
                      Graph: {esc.graphId.slice(0, 8)} · Created: {new Date(esc.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Resolved ({resolved.length})
              </h2>
              <div className="space-y-2">
                {resolved.map((esc) => (
                  <div key={esc.id} className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border', levelColors[esc.level])}>
                          {esc.level}
                        </span>
                        <span className="text-xs text-slate-400">{esc.nodeId}</span>
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border', statusColors[esc.status])}>
                          {esc.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono">
                        {esc.resolvedAt ? new Date(esc.resolvedAt).toLocaleString() : '—'}
                      </span>
                    </div>
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
