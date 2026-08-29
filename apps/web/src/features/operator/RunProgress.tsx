import React from 'react';
import { PlanStep } from '../../types/run';
import { CheckCircleIcon } from '../../components/common/Icons';

interface RunProgressProps {
  plan: PlanStep[];
  currentPhase: 'Understand' | 'Investigate' | 'Fix' | 'Test' | 'Verify';
  onStepClick?: (step: PlanStep) => void;
}

export const RunProgress: React.FC<RunProgressProps> = ({ plan, currentPhase, onStepClick }) => {
  const phases: Array<'Understand' | 'Investigate' | 'Fix' | 'Test' | 'Verify'> = [
    'Understand',
    'Investigate',
    'Fix',
    'Test',
    'Verify',
  ];

  const getPhaseStatus = (phase: string) => {
    const matchingSteps = plan.filter((s) => s.phase === phase);
    if (matchingSteps.length === 0) {
      const currentIdx = phases.indexOf(currentPhase);
      const thisIdx = phases.indexOf(phase as any);
      if (thisIdx < currentIdx) return 'completed';
      if (thisIdx === currentIdx) return 'active';
      return 'pending';
    }

    if (matchingSteps.every((s) => s.status === 'completed')) return 'completed';
    if (matchingSteps.some((s) => s.status === 'active')) return 'active';
    if (matchingSteps.some((s) => s.status === 'failed')) return 'failed';
    return 'pending';
  };

  return (
    <div className="bg-[#161b22] border-t border-[#30363d] px-6 py-3 flex items-center justify-between shadow-inner">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <span>RUN STATUS</span>
        <span className="text-slate-600">|</span>
      </div>

      {/* Linear Plan Progression Steps */}
      <div className="flex-1 max-w-4xl mx-auto flex items-center justify-between px-4">
        {phases.map((phase, idx) => {
          const status = getPhaseStatus(phase);
          const isCurrent = currentPhase === phase;

          return (
            <React.Fragment key={phase}>
              <div
                onClick={() => {
                  const step = plan.find((s) => s.phase === phase);
                  if (step) onStepClick?.(step);
                }}
                className={`flex items-center gap-2 cursor-pointer group transition-all ${
                  isCurrent ? 'scale-105' : 'opacity-80 hover:opacity-100'
                }`}
              >
                {status === 'completed' && (
                  <CheckCircleIcon size={16} className="text-emerald-400" />
                )}
                {status === 'active' && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                  </span>
                )}
                {status === 'pending' && (
                  <span className="w-3 h-3 rounded-full border border-slate-600 inline-block" />
                )}
                {status === 'failed' && (
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                )}

                <span
                  className={`text-xs font-medium uppercase tracking-wide transition-colors ${
                    isCurrent
                      ? 'text-cyan-300 font-bold'
                      : status === 'completed'
                      ? 'text-slate-200'
                      : 'text-slate-400'
                  }`}
                >
                  {phase}
                </span>
              </div>

              {idx < phases.length - 1 && (
                <div className="flex-1 mx-3 h-0.5 bg-[#30363d] relative overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      getPhaseStatus(phases[idx + 1]) === 'completed' || status === 'completed'
                        ? 'bg-emerald-500/80 w-full'
                        : isCurrent
                        ? 'bg-cyan-500 w-1/2 animate-pulse'
                        : 'w-0'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
