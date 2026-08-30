import React from 'react';
import { CheckCircle2, Circle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { RiskBadge } from './RiskBadge';

export type PlanStepStatus = 'COMPLETED' | 'RUNNING' | 'PENDING' | 'FAILED' | 'SKIPPED';

export interface SubStep {
  title: string;
  completed: boolean;
}

export interface PlanStepProps {
  index: number;
  title: string;
  description?: string;
  status: PlanStepStatus;
  durationSeconds?: number;
  riskLevel?: string;
  subSteps?: SubStep[];
  isCurrent?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PlanStep({
  index,
  title,
  description,
  status,
  durationSeconds,
  riskLevel,
  subSteps = [],
  isCurrent = false,
  onClick,
  className,
}: PlanStepProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'RUNNING':
        return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />;
      case 'FAILED':
        return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'SKIPPED':
        return <Circle className="w-4 h-4 text-slate-600 shrink-0" />;
      case 'PENDING':
      default:
        return <Circle className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };

  const getContainerBorder = () => {
    if (isCurrent || status === 'RUNNING') {
      return 'border-cyan-500/50 bg-cyan-950/20';
    }
    if (status === 'COMPLETED') {
      return 'border-slate-800 bg-slate-900/40 hover:border-slate-700';
    }
    if (status === 'FAILED') {
      return 'border-rose-500/40 bg-rose-950/20';
    }
    return 'border-slate-800/60 bg-slate-950/30 opacity-75';
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3.5 rounded-lg border transition-all text-xs',
        onClick && 'cursor-pointer',
        getContainerBorder(),
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-slate-400 text-xs font-bold w-4">{index}.</span>
            {getStatusIcon()}
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                'font-medium text-sm',
                status === 'COMPLETED' ? 'text-slate-200' : isCurrent ? 'text-cyan-300 font-semibold' : 'text-slate-300'
              )}>
                {title}
              </span>
              {riskLevel && <RiskBadge level={riskLevel} size="sm" showIcon={false} />}
            </div>
            {description && <p className="text-slate-400 text-xs mt-0.5">{description}</p>}
          </div>
        </div>
        {durationSeconds !== undefined && durationSeconds > 0 && (
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 shrink-0">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(durationSeconds)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
