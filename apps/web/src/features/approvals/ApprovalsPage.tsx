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

  // Derive human-friendly explanations
  const getToolActionDescription = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('write') || n.includes('patch')) return 'Modify or create codebase files';
    if (n.includes('command') || n.includes('exec') || n.includes('bash')) return 'Execute terminal shell command';
    if (n.includes('sql') || n.includes('db') || n.includes('migration')) return 'Mutate database schema or data';
    if (n.includes('config') || n.includes('kernel')) return 'Update runtime governance or security settings';
    return 'Execute physical system tool';
  };

  return (
    <div className={cn(
      'bg-slate-900/90 border rounded-xl p-5 space-y-4 shadow-lg',
      approval.riskLevel === 'CRITICAL' ? 'border-rose-800/60 bg-rose-950/15' : 'border-slate-800'
    )}>
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-800 text-cyan-400 font-mono text-xs font-bold border border-slate-700">
            {approval.toolName}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-100">
                {getToolActionDescription(approval.toolName)}
              </span>
              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono', riskColors[approval.riskLevel] || riskColors.MEDIUM)}>
                {approval.riskLevel} RISK
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Request ID: {approval.id.slice(0, 8)} • Mission: {approval.sessionId.slice(0, 8)}
            </p>
          </div>
        </div>
        <span className={cn('px-2.5 py-1 rounded-md text-xs font-bold font-mono border uppercase tracking-wider', statusColors[approval.status] || statusColors.pending)}>
          {approval.status}
        </span>
      </div>

      {/* Human Guidance Context: Why am I being asked? */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg space-y-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-semibold">
            WHY AM I BEING ASKED?
          </span>
          <p className="text-slate-300">
            {approval.reason || 'This tool performs physical modifications and requires human operator authorization under tenant safety policy.'}
          </p>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg space-y-1">
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block font-semibold">
            CLINE'S RECOMMENDATION
          </span>
          <p className="text-slate-300">
            {approval.riskLevel === 'CRITICAL'
              ? 'Review carefully — this action modifies sensitive infrastructure or permanent data.'
              : 'Approve — this action is a planned milestone required to advance the mission frontier.'}
          </p>
        </div>
      </div>

      {/* Proposed Tool Parameters */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block font-semibold">
          PROPOSED ACTION DETAILS
        </span>
        <pre className="p-3 bg-slate-950 border border-slate-800/90 rounded-lg text-xs text-cyan-300 font-mono overflow-x-auto max-h-36 whitespace-pre-wrap">
          {JSON.stringify(approval.toolParameters, null, 2)}
        </pre>
      </div>

      {/* Consequences breakdown */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 p-2.5 bg-slate-950/40 border border-slate-800/50 rounded-lg">
        <div>
          <span className="text-emerald-400 font-bold">✓ IF APPROVED:</span> ToolGateway issues HMAC token and executes immediately.
        </div>
        <div>
          <span className="text-rose-400 font-bold">✕ IF REJECTED:</span> Action is denied; Cline replans an alternative strategy.
        </div>
      </div>

      {/* Action Controls for Pending */}
      {isPending && (
        <div className="pt-3 border-t border-slate-800 space-y-3">
          <input
            type="text"
            placeholder="Feedback or reason for decision (optional)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDecide('REJECTED')}
              disabled={deciding}
              className="flex-1 py-2 text-xs font-bold text-rose-300 bg-rose-950/60 border border-rose-800/60 rounded-lg hover:bg-rose-900/60 transition-colors disabled:opacity-50 cursor-pointer font-mono"
            >
              ✕ Reject Request
            </button>
            <button
              onClick={() => handleDecide('APPROVED')}
              disabled={deciding}
              className="flex-1 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors disabled:opacity-50 cursor-pointer font-mono shadow-md shadow-emerald-500/20"
            >
              ✓ Approve & Execute
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
