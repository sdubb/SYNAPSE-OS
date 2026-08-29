import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PolicyRiskLevel } from '@/types';

export interface RiskBadgeProps {
  level?: PolicyRiskLevel | string;
  risk?: PolicyRiskLevel | string;
  score?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RiskBadge({
  level,
  risk,
  score,
  showIcon = true,
  size = 'md',
  className,
}: RiskBadgeProps) {
  const rawLevel = level || risk || 'LOW';
  const normalized = String(rawLevel).toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  const configMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    LOW: {
      label: 'LOW RISK',
      color: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-glow-emerald',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
    },
    MEDIUM: {
      label: 'MEDIUM RISK',
      color: 'bg-yellow-950/60 text-yellow-300 border-yellow-500/40 shadow-glow-amber',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />,
    },
    HIGH: {
      label: 'HIGH RISK',
      color: 'bg-orange-950/60 text-orange-300 border-orange-500/40 shadow-glow-amber',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-orange-400 shrink-0" />,
    },
    CRITICAL: {
      label: 'CRITICAL RISK',
      color: 'bg-rose-950/70 text-rose-300 border-rose-500/50 shadow-glow-rose font-bold',
      icon: <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />,
    },
  };

  const config = configMap[normalized] || {
    label: normalized,
    color: 'bg-slate-900 text-slate-300 border-slate-700',
    icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
  };

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 rounded gap-1 font-mono',
    md: 'text-xs px-2.5 py-1 rounded-md gap-1.5 font-mono',
    lg: 'text-sm px-3 py-1.5 rounded-lg gap-2 font-mono',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center select-none border transition-all',
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
      {score !== undefined && (
        <span className="opacity-75 text-[10px] font-mono ml-0.5">({score})</span>
      )}
    </span>
  );
}
