import React, { useState } from 'react';
import { ToolApproval, RiskLevel } from '../../types/run';
import { AlertTriangleIcon, CheckCircleIcon, XCircleIcon, ShieldAlertIcon } from '../../components/common/Icons';

interface ApprovalCardProps {
  approval: ToolApproval;
  onApprove?: (approvalId: string, reason?: string) => void;
  onReject?: (approvalId: string, reason?: string) => void;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({ approval, onApprove, onReject }) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const getRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case 'CRITICAL':
        return (
          <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
            <ShieldAlertIcon size={12} className="text-rose-400" />
            CRITICAL RISK
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-orange-950 text-orange-300 border border-orange-800">
            HIGH RISK
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800">
            MEDIUM RISK
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
            LOW RISK
          </span>
        );
    }
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onApprove?.(approval.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    setIsProcessing(true);
    try {
      await onReject?.(approval.id, rejectReason);
    } finally {
      setIsProcessing(false);
      setShowRejectInput(false);
    }
  };

  return (
    <div className="bg-[#161b22] border-2 border-amber-500/80 rounded-xl p-5 shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-800">
            <AlertTriangleIcon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">TOOL APPROVAL REQUIRED</span>
              {getRiskBadge(approval.riskLevel)}
            </div>
            <h3 className="text-sm md:text-base font-semibold text-white mt-0.5">
              Execute <span className="font-mono text-cyan-300">{approval.toolName}</span>
            </h3>
          </div>
        </div>

        {approval.status !== 'pending' && (
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${approval.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
            {approval.status === 'approved' ? '✓ APPROVED' : '✕ REJECTED'}
          </span>
        )}
      </div>

      {/* Reason */}
      {approval.reason && (
        <div className="text-xs text-slate-300 bg-[#0d1117] p-3 rounded-lg border border-[#30363d] leading-relaxed">
          <strong className="text-slate-400">Reason: </strong> {approval.reason}
        </div>
      )}

      {/* Affected Resources / Files */}
      {approval.affectedFiles && approval.affectedFiles.length > 0 && (
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-slate-400 font-medium">Affected Files:</span>
          <div className="flex flex-wrap gap-1.5 font-mono">
            {approval.affectedFiles.map((file, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded bg-[#21262d] text-slate-300 border border-[#30363d]">
                {file}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Parameters Snippet */}
      {approval.parameters && Object.keys(approval.parameters).length > 0 && (
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-slate-400 font-medium">Parameters:</span>
          <pre className="bg-[#0d1117] text-slate-300 p-2.5 rounded-lg border border-[#30363d] font-mono text-[11px] overflow-x-auto">
            {JSON.stringify(approval.parameters, null, 2)}
          </pre>
        </div>
      )}

      {/* Actions */}
      {approval.status === 'pending' ? (
        <div className="flex flex-col gap-2 pt-2 border-t border-[#30363d]">
          {showRejectInput && (
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)..."
              className="bg-[#0d1117] border border-rose-800/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleReject}
              className="px-4 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <XCircleIcon size={14} />
              <span>{showRejectInput ? 'Confirm Rejection' : 'Reject'}</span>
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApprove}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <CheckCircleIcon size={14} />
              <span>Approve Execution</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-500 italic">
          Decision recorded by {approval.decidedBy || 'Operator'}.
        </div>
      )}
    </div>
  );
};
