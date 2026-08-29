import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'neutral'
    | 'cyan'
    | 'blue'
    | 'purple'
    | 'emerald'
    | 'amber'
    | 'rose'
    | 'outline';
  size?: 'xs' | 'sm' | 'md';
  hasDot?: boolean;
  pulse?: boolean;
}

export function Badge({
  variant = 'default',
  size = 'sm',
  hasDot = false,
  pulse = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.2 rounded font-mono',
    sm: 'text-xs px-2 py-0.5 rounded-md font-mono',
    md: 'text-xs px-2.5 py-1 rounded-md font-medium',
  };

  const variantClasses = {
    default: 'bg-slate-800 text-slate-300 border border-slate-700/60',
    neutral: 'bg-slate-850 text-slate-400 border border-slate-800',
    cyan: 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 shadow-glow-cyan',
    blue: 'bg-blue-950/60 text-blue-300 border border-blue-500/30',
    purple: 'bg-purple-950/60 text-purple-300 border border-purple-500/30 shadow-glow-purple',
    emerald: 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 shadow-glow-emerald',
    amber: 'bg-amber-950/60 text-amber-300 border border-amber-500/30 shadow-glow-amber',
    rose: 'bg-rose-950/60 text-rose-300 border border-rose-500/30 shadow-glow-rose',
    outline: 'bg-transparent text-slate-300 border border-slate-700',
  };

  const dotColorClasses = {
    default: 'bg-slate-400',
    neutral: 'bg-slate-500',
    cyan: 'bg-cyan-400',
    blue: 'bg-blue-400',
    purple: 'bg-purple-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    outline: 'bg-slate-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 select-none font-medium transition-colors',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {hasDot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulse && (
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                dotColorClasses[variant]
              )}
            />
          )}
          <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', dotColorClasses[variant])} />
        </span>
      )}
      {children}
    </span>
  );
}
