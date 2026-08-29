import React from 'react';
import { VerificationRun } from '../../../types/index.js';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, FileCheck, Check, FlaskConical } from 'lucide-react';
import { StatusBadge, MetricCard } from '../../../components/ui/index.js';

export const VerificationTab: React.FC<{ verification: VerificationRun | null }> = ({ verification }) => {
  if (!verification) {
    return <div className="text-slate-400 text-sm">No verification run attached to this execution.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Verdict Header Banner */}
      <div
        className={`p-5 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
          verification.verdict === 'PASS'
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : verification.verdict === 'FAIL'
            ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-current">
            {verification.verdict === 'PASS' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            ) : verification.verdict === 'FAIL' ? (
              <XCircle className="w-6 h-6 text-rose-400" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            )}
          </div>
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider">Verification Pipeline Verdict</div>
            <div className="text-2xl font-bold font-mono tracking-tight">{verification.verdict} ({verification.score}/100)</div>
          </div>
        </div>

        <div className="text-right text-xs font-mono">
          <div className="text-slate-300 font-semibold">{verification.passedAssertions}/{verification.totalAssertions} Assertions Passed</div>
          <div className="text-slate-400">{verification.testsSummary.passed}/{verification.testsSummary.total} Unit Tests Passed ({verification.testsSummary.durationMs}ms)</div>
        </div>
      </div>

      {/* Critical Principle: Agent Claim vs Ground Truth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Agent Stated Claim
          </span>
          <p className="text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800/80 leading-relaxed font-mono text-xs">
            "{verification.agentClaim}"
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 block mb-1">
            Ground Truth (Verified by Synapse Control Plane)
          </span>
          <p className="text-sm text-emerald-300 bg-slate-950 p-3 rounded-lg border border-emerald-500/30 leading-relaxed font-mono text-xs">
            {verification.groundTruthVerdict}
          </p>
        </div>
      </div>

      {/* Assertions Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-cyan-400" />
            Verification Assertions & Evidence Matrix
          </h4>
        </div>
        <div className="divide-y divide-slate-800/60">
          {verification.assertions.map((as) => (
            <div key={as.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-start gap-3">
              <div className="p-1 rounded-full bg-slate-950 shrink-0 mt-0.5">
                {as.status === 'passed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-semibold text-slate-200">{as.name}</h5>
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                    {as.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{as.details}</p>
                <div className="flex flex-wrap gap-4 pt-1 text-[11px] font-mono text-slate-400">
                  <span>Claim: <strong className="text-slate-300">{as.agentClaim}</strong></span>
                  <span>Ground truth: <strong className="text-emerald-300">{as.groundTruth}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
