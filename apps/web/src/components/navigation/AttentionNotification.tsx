import React, { useState } from 'react';
import { Bell, ShieldAlert, AlertTriangle, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApprovals } from '@/hooks/useApprovals';
import { useVerification } from '@/hooks/useVerification';
import { cn } from '@/lib/utils';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';

export function AttentionNotification() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { pendingApprovals, resolveApproval, isResolving } = useApprovals();
  const { verifications } = useVerification();

  const failedVerifications = (verifications || []).filter((v: any) => v.verdict === 'FAIL');
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
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-glow-rose animate-pulse">
            {totalAttentionCount}
          </span>
        )}
      </button>

      <Drawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="ATTENTION REQUIRED"
        description="Active approval requests, verification failures, and interventions"
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

          {/* Pending Approval Requests */}
          {pendingApprovals.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 font-mono">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Pending Policy Approvals ({pendingApprovals.length})</span>
              </div>

              {pendingApprovals.map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 rounded-lg border border-amber-500/40 bg-amber-950/20 space-y-2.5 shadow-glow-amber text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-100">{req.toolName}</span>
                      <p className="text-slate-300 text-[11px] mt-0.5">
                        {req.reason || 'Agent requested execution of elevated capability.'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-500/40 font-mono">
                      {req.riskLevel}
                    </span>
                  </div>

                  {req.toolParameters && Object.keys(req.toolParameters).length > 0 && (
                    <div className="p-2 bg-slate-950/80 rounded font-mono text-[10px] text-slate-300 overflow-x-auto">
                      <pre>{JSON.stringify(req.toolParameters, null, 2)}</pre>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="danger"
                      size="xs"
                      isLoading={isResolving}
                      onClick={async () => {
                        await resolveApproval({ id: req.id, decision: 'REJECTED', reason: 'Operator rejected' });
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="success"
                      size="xs"
                      isLoading={isResolving}
                      onClick={async () => {
                        await resolveApproval({ id: req.id, decision: 'APPROVED' });
                      }}
                    >
                      Approve & Execute
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Failed Verifications */}
          {failedVerifications.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 font-mono">
                <XCircle className="w-3.5 h-3.5" />
                <span>Verification Failures ({failedVerifications.length})</span>
              </div>

              {failedVerifications.map((vf: any) => (
                <div
                  key={vf.id}
                  className="p-3.5 rounded-lg border border-rose-500/40 bg-rose-950/20 space-y-2 shadow-glow-rose text-xs"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-semibold text-slate-100">Verification #{vf.id.slice(0, 8)}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-500/40 font-mono">
                      FAIL
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    Automatic AST & test suite validation failed. Human review required.
                  </p>
                  <Button
                    variant="outline"
                    size="xs"
                    rightIcon={<ArrowRight className="w-3 h-3" />}
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/verification');
                    }}
                  >
                    Inspect Failure Details
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
}
