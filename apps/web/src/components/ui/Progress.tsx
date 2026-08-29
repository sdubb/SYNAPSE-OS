import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  variant?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  striped?: boolean;
}

export function Progress({
  value,
  max = 100,
  variant = 'cyan',
  size = 'sm',
  showLabel = false,
  striped = false,
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const sizeClasses = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantClasses = {
    cyan: 'bg-cyan-500 shadow-glow-cyan',
    emerald: 'bg-emerald-500 shadow-glow-emerald',
    amber: 'bg-amber-500 shadow-glow-amber',
    rose: 'bg-rose-500 shadow-glow-rose',
    purple: 'bg-purple-500 shadow-glow-purple',
    gradient: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500',
  };

  return (
    <div className={cn('w-full space-y-1.5', className)} {...props}>
      {showLabel && (
        <div className="flex justify-between text-xs font-mono text-slate-400">
          <span>Progress</span>
          <span className="font-semibold text-white">{percentage}%</span>
        </div>
      )}
      <div className={cn('w-full bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50', sizeClasses[size])}>
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out rounded-full',
            variantClasses[variant],
            striped && 'bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
