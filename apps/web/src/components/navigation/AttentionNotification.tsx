import React, { useState } from 'react';
import {
  Bell, ShieldAlert, CheckCircle2, AlertTriangle,
  Flame, XCircle, ArrowRight, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApprovals } from '@/hooks/useApprovals';
import { useVerifications } from '@/hooks/useVerifications';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { apiClient } from '@/api/client';
import { useToast } from '../ui/Toast';
import { cn } from '@/lib/utils';

export function AttentionNotification() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { success, error } = useToast();
  const { data: approvals, refetch: refetchApprovals } = useApprovals();
  const { data: verifications } = useVerifications();

  const pendingApprovals = (approvals || []).filter(
    (a) => a.status === 'pending' || a.status === 'PENDING'
  );
  const failedVerifications = (verifications || []).filter(
    (v) => v.overallVerdict === 'FAIL'
  );
  const totalAttentionCount = pendingApprovals.length + failedVerifications.length;

  const handleResolve = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      await apiClient.resolveApproval(id, decision, `Resolved via Needs You tray: ${decision}`);
      success(`Approval ${decision}`, `Tool execution ${decision.toLowerCase()}.`);
      refetchApprovals();
    } catch (err: any) {
      error('Failed to resolve', err.message);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
        title="Attention Required / Needs You"
      >
        <Bell className="w-4 h-4" />
        {totalAttentionCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-mono font-bold text-white animate-pulse">
            {totalAttentionCount}
          </span>
        )}
      </button>

      <Drawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="NEEDS YOU • ACTION CENTER"
        description="Pending human approvals, escalations, and system safety holds"
        size="md"
      >
        <div className="space-y-4 font-mono">
          {totalAttentionCount === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">All Systems Nominal</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No active human approvals, escalations, or safety interruptions require operator action.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pending Approvals */}
              {pendingApprovals.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-slate-100">{req.toolName}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                      {req.riskLevel} RISK
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    {req.reason || 'Destructive tool operation requires human operator authorization.'}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="danger"
                      className="w-1/2 text-xs"
                      onClick={() => handleResolve(req.id, 'REJECTED')}
                    >
                      ✕ Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      className="w-1/2 text-xs"
                      onClick={() => handleResolve(req.id, 'APPROVED')}
                    >
                      ✓ Authorize
                    </Button>
                  </div>
                </div>
              ))}

              {/* Failed Verifications */}
              {failedVerifications.map((vf) => (
                <div
                  key={vf.id}
                  className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/20 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-400">
                      <XCircle className="w-4 h-4" />
                      <span className="text-xs font-bold">Verification Failed</span>
                    </div>
                    <span className="text-[10px] text-slate-500">#{vf.id.slice(0, 8)}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Mission integrity verification encountered a violation.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
}

export default AttentionNotification;
