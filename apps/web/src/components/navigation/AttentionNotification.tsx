import React, { useState } from 'react';
import { Bell, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useApprovals } from '@/hooks/useApprovals';
import { useVerifications } from '@/hooks/useVerifications';
import { cn } from '@/lib/utils';
import { Drawer } from '../ui/Drawer';

export function AttentionNotification() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: approvals } = useApprovals();
  const { data: verifications } = useVerifications();

  const pendingApprovals = (approvals || []).filter(
    (a) => a.status === 'pending' || a.status === 'PENDING'
  );
  const failedVerifications = (verifications || []).filter(
    (v) => v.overallVerdict === 'FAIL'
  );
  const totalAttentionCount = pendingApprovals.length + failedVerifications.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
        title="Attention Required"
      >
        <Bell className="w-4 h-4" />
        {totalAttentionCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse">
            {totalAttentionCount}
          </span>
        )}
      </button>

      <Drawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="ATTENTION REQUIRED"
        description="Active approval requests and verification failures"
        size="md"
      >
        <div className="space-y-4">
          {totalAttentionCount === 0 ? (
            <div className="py-16 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-200">All Systems Nominal</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No active human approvals or verification failures currently require attention.
              </p>
            </div>
          ) : null}

          {pendingApprovals.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 font-mono">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Pending Approvals ({pendingApprovals.length})</span>
              </div>
              {pendingApprovals.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-lg border border-amber-500/40 bg-amber-950/20 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-100">{req.toolName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-500/40 font-mono">
                      {req.riskLevel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {failedVerifications.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 font-mono">
                <span>Verification Failures ({failedVerifications.length})</span>
              </div>
              {failedVerifications.map((vf) => (
                <div
                  key={vf.id}
                  className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/20 text-xs"
                >
                  <span className="font-semibold text-slate-100">Verification #{vf.id.slice(0, 8)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
}
