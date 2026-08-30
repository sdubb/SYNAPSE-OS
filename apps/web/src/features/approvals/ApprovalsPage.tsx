import React, { useState } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { useApprovals } from '@/hooks/useApprovals';
import { apiClient } from '@/api/client';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import type { ToolApprovalRequest } from '@/types';

function ApprovalCard({ approval, onDecide }: {
  approval: ToolApprovalRequest;
  onDecide: (id: string, decision: 'APPROVED' | 'REJECTED') => void;
}) {
  const [reason, setReason] = useState('');
  const [deciding, setDeciding] = useState(false);
  const isPending = approval.status === 'pending' || approval.status === 'PENDING';

  const riskColors: Record<string, string> = {
    LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    CRITICAL: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    REJECTED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };

  const handleDecide = async (decision: 'APPROVED' | 'REJECTED') => {
    setDeciding(true);
    try {
      await apiClient.resolveApproval(approval.id, decision, reason || `Decision by operator: ${decision}`);
      onDecide(approval.id, decision);
    } finally {
      setDeciding(false);
    }
  };

  return (
    <div className={cn(
      'bg-slate-900/80 border rounded-xl p-5',
      approval.riskLevel === 'CRITICAL' ? 'border-rose-900/50 bg-rose-950/10' : 'border-slate-800'
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono font-medium text-slate-200">{approval.toolName}</span>
          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border', riskColors[approval.riskLevel] || riskColors.MEDIUM)}>
            {approval.riskLevel}
          </span>
          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium border', statusColors[approval.status] || statusColors.pending)}>
            {approval.status}
          </span>
        </div>
        <span className="text-[10px] text-slate-600 font-mono">{approval.id.slice(0, 8)}</span>
      </div>

      {approval.reason && (
        <p className="text-xs text-slate-400 mb-3 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
          {approval.reason}
        </p>
      )}

      <div className="mb-3">
        <span className="text-[10px] text-slate-500 block mb-1">TOOL PARAMETERS</span>
        <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-cyan-300 font-mono overflow-x-auto max-h-32 whitespace-pre-wrap">
          {JSON.stringify(approval.toolParameters, null, 2)}
        </pre>
      </div>

      <div className="grid grid-cols-4 gap-3 text-[10px] text-slate-500 font-mono mb-3">
        <div><span className="block text-slate-600">AGENT</span>{approval.agentId.slice(0, 8)}</div>
        <div><span className="block text-slate-600">SESSION</span>{approval.sessionId.slice(0, 8)}</div>
        <div><span className="block text-slate-600">TIMEOUT</span>{approval.timeoutSeconds}s</div>
        <div><span className="block text-slate-600">EXPIRES</span>{approval.expiresAt ? new Date(approval.expiresAt).toLocaleTimeString() : '—'}</div>
      </div>

      {isPending && (
        <div className="pt-3 border-t border-slate-800 space-y-3">
          <input
            type="text"
            placeholder="Decision reason (optional)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDecide('REJECTED')}
              disabled={deciding}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/50 border border-rose-800/50 rounded-lg hover:bg-rose-900/50 transition-colors disabled:opacity-50"
            >
              ✕ Reject
            </button>
            <button
              onClick={() => handleDecide('APPROVED')}
              disabled={deciding}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/50 border border-emerald-800/50 rounded-lg hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
            >
              ✓ Approve
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ApprovalsPage() {
  const { data: approvals, isLoading, refetch } = useApprovals();
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');

  const pending = (approvals || []).filter((a) => a.status === 'pending' || a.status === 'PENDING');
  const resolved = (approvals || []).filter((a) => a.status !== 'pending' && a.status !== 'PENDING');
  const currentList = activeTab === 'pending' ? pending : resolved;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-48" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-100">Approvals</h1>
          {pending.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
              {pending.length} PENDING
            </span>
          )}
        </div>
        <button onClick={() => refetch()} className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {(['pending', 'resolved'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-xs font-medium rounded-lg transition',
              activeTab === tab ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {tab === 'pending' ? `Pending (${pending.length})` : `Resolved (${resolved.length})`}
          </button>
        ))}
      </div>

      {currentList.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck />}
          title={activeTab === 'pending' ? 'No pending approvals' : 'No resolved approvals'}
          description={activeTab === 'pending'
            ? 'All approval requests have been resolved. New requests will appear here when agents require human authorization.'
            : 'No resolved approval requests in history.'
          }
        />
      ) : (
        <div className="space-y-3">
          {currentList.map((approval) => (
            <ApprovalCard key={approval.id} approval={approval} onDecide={() => refetch()} />
          ))}
        </div>
      )}
    </div>
  );
}
