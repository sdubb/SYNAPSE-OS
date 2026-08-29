import React from 'react';
import { ApprovalItem } from '../../../types/index.js';
import { ShieldCheck, ShieldAlert, Check, X, Clock, UserCheck } from 'lucide-react';
import { Button, StatusBadge, RiskBadge } from '../../../components/ui/index.js';
import { useApprovals } from '../../../hooks/useApi.js';

export const ApprovalsTab: React.FC<{ approvals: ApprovalItem[] }> = ({ approvals }) => {
  const { resolve } = useApprovals();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          Run Approvals & Human Sign-off Matrix ({approvals.length})
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          High-risk and critical policy trigger events that paused execution awaiting human authorization.
        </p>
      </div>

      <div className="space-y-4">
        {approvals.map((appr) => (
          <div
            key={appr.id}
            className={`border rounded-xl p-5 bg-slate-900/90 shadow transition-all ${
              appr.status === 'pending'
                ? 'border-amber-500/50 shadow-amber-950/20'
                : 'border-slate-800'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <RiskBadge risk={appr.riskLevel} />
                <span className="font-mono text-sm font-bold text-slate-100">{appr.toolName}</span>
                <StatusBadge status={appr.status} size="sm" />
              </div>

              <div className="text-xs text-slate-500 font-mono">
                Requested: {new Date(appr.createdAt).toLocaleTimeString()}
              </div>
            </div>

            {appr.reason && (
              <p className="text-xs text-slate-300 mb-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
                <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1">Reason:</span>
                {appr.reason}
              </p>
            )}

            <div className="mb-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Requested Tool Parameters:
              </span>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                {JSON.stringify(appr.toolParameters, null, 2)}
              </pre>
            </div>

            {appr.status === 'pending' ? (
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  size="sm"
                  variant="danger"
                  icon={<X className="w-3.5 h-3.5" />}
                  onClick={() => resolve(appr.id, 'REJECTED', 'Rejected by operator.')}
                >
                  Reject Action
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Check className="w-3.5 h-3.5" />}
                  onClick={() => resolve(appr.id, 'APPROVED', 'Approved by operator.')}
                >
                  Approve Execution
                </Button>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <UserCheck className="w-4 h-4" /> Decided by: {appr.decidedBy || 'Operator'}
                </span>
                <span>Decision Reason: {appr.decisionReason || 'Manual decision applied.'}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
