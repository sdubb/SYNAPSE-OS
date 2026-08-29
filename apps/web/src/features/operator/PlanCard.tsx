import React from 'react';
import { PlanStep } from '../../types/run';
import { CheckCircleIcon, XCircleIcon } from '../../components/common/Icons';

interface PlanCardProps {
  plan: PlanStep[];
  objective?: string;
  onStepClick?: (step: PlanStep) => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan, objective, onStepClick }) => {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3 shadow-md">
      <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">EXECUTION PLAN</span>
        {objective && <span className="text-xs text-slate-400 truncate max-w-xs">{objective}</span>}
      </div>

      <div className="flex flex-col gap-2">
        {plan.map((step) => (
          <div
            key={step.id}
            onClick={() => onStepClick?.(step)}
            className="flex items-center justify-between p-2.5 rounded-lg bg-[#21262d]/50 hover:bg-[#21262d] border border-[#30363d]/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono text-slate-500 w-4 text-center">{step.index}</span>

              {step.status === 'completed' && <CheckCircleIcon size={16} className="text-emerald-400" />}
              {step.status === 'active' && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
              )}
              {step.status === 'pending' && <span className="inline-block w-3 h-3 rounded-full border border-slate-600" />}
              {step.status === 'failed' && <XCircleIcon size={16} className="text-rose-400" />}

              <div className="flex flex-col">
                <span className="text-xs md:text-sm font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">
                  {step.title}
                </span>
                {step.description && <span className="text-xs text-slate-500">{step.description}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-[#0d1117] text-slate-400 font-mono">
                {step.phase}
              </span>
              {step.durationMs && (
                <span className="text-xs text-slate-500 font-mono">
                  {(step.durationMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
