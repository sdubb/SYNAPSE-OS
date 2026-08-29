import React from 'react';
import { VerificationEvidence } from '../../types/run';
import { CheckCircleIcon, XCircleIcon, ShieldAlertIcon } from '../../components/common/Icons';

interface EvidenceCardProps {
  evidence: VerificationEvidence;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence }) => {
  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'PASS':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
            <CheckCircleIcon size={14} />
            VERDICT: PASS
          </span>
        );
      case 'FAIL':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800">
            <XCircleIcon size={14} />
            VERDICT: FAIL
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800">
            <ShieldAlertIcon size={14} />
            VERDICT: REVIEW
          </span>
        );
    }
  };

  return (
    <div className="bg-[#161b22] border-2 border-emerald-500/50 rounded-xl p-5 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">VERIFICATION EVIDENCE</span>
          <h3 className="text-base font-semibold text-white mt-0.5">{evidence.title}</h3>
        </div>
        {getVerdictBadge(evidence.verdict)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#0d1117] p-3.5 rounded-lg border border-[#30363d] text-xs">
        <div className="flex flex-col gap-1">
          <span className="text-slate-500 font-semibold uppercase">Agent Claim</span>
          <p className="text-slate-200 italic">"{evidence.claim}"</p>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-emerald-400 font-semibold uppercase">Ground Truth Evidence</span>
          <p className="text-slate-200">{evidence.groundTruth}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase">Verification Assertions:</span>
        <div className="flex flex-col gap-1.5">
          {evidence.assertions.map((ast, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-lg bg-[#21262d] border border-[#30363d] text-xs"
            >
              <div className="flex items-center gap-2">
                {ast.passed ? (
                  <CheckCircleIcon size={14} className="text-emerald-400" />
                ) : (
                  <XCircleIcon size={14} className="text-rose-400" />
                )}
                <span className="text-slate-200 font-medium">{ast.name}</span>
              </div>
              <span className="text-slate-400 font-mono">{ast.evidence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
