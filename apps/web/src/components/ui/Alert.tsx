import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error' | 'cyber';
  title?: string;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

export function Alert({
  variant = 'info',
  title,
  children,
  onDismiss,
  icon,
  className,
  ...props
}: AlertProps) {
  const defaultIcons = {
    info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    cyber: <Info className="w-5 h-5 text-purple-400 shrink-0" />,
  };

  const variantStyles = {
    info: 'bg-cyan-950/40 border-cyan-500/30 text-cyan-200',
    success: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200',
    warning: 'bg-amber-950/40 border-amber-500/30 text-amber-200',
    error: 'bg-rose-950/40 border-rose-500/30 text-rose-200',
    cyber: 'bg-purple-950/40 border-purple-500/30 text-purple-200 shadow-glow-purple',
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border text-sm',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <span className="mt-0.5">{icon || defaultIcons[variant]}</span>
      <div className="flex-1 space-y-1">
        {title && <h5 className="font-semibold text-white leading-tight">{title}</h5>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
