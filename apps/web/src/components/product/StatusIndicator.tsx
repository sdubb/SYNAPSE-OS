import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip } from '../ui/Tooltip';

export type SynapseStatusType =
  | 'RUNNING'
  | 'WAITING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED'
  | 'BLOCKED'
  | 'IDLE'
  | 'QUEUED'
  | 'ACTIVE'
  | 'PASS'
  | 'FAIL';

export interface StatusIndicatorProps {
  status: string | SynapseStatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  pulse?: boolean;
  tooltipText?: string;
  className?: string;
}

export function StatusIndicator({
  status,
  label,
  size = 'md',
  showLabel = true,
  pulse = true,
  tooltipText,
  className,
}: StatusIndicatorProps) {
  const normalized = (status || 'IDLE').toUpperCase();

  const getStatusConfig = () => {
    switch (normalized) {
      case 'RUNNING':
      case 'ACTIVE':
        return {
          color: 'bg-cyan-400',
          ring: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/50 shadow-glow-cyan',
          ping: 'bg-cyan-400',
          defaultLabel: 'Running',
        };
      case 'WAITING':
      case 'AWAITING_INPUT':
      case 'AWAITING_APPROVAL':
        return {
          color: 'bg-amber-400',
          ring: 'border-amber-500/40 text-amber-300 bg-amber-950/50 shadow-glow-amber',
          ping: 'bg-amber-400',
          defaultLabel: 'Waiting for Approval',
        };
      case 'VERIFYING':
        return {
          color: 'bg-purple-400',
          ring: 'border-purple-500/40 text-purple-300 bg-purple-950/50 shadow-glow-purple',
          ping: 'bg-purple-400',
          defaultLabel: 'Verifying',
        };
      case 'COMPLETED':
      case 'PASS':
        return {
          color: 'bg-emerald-400',
          ring: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/50 shadow-glow-emerald',
          ping: 'bg-emerald-400',
          defaultLabel: 'Completed',
        };
      case 'FAILED':
      case 'FAIL':
      case 'ERROR':
        return {
          color: 'bg-rose-500',
          ring: 'border-rose-500/40 text-rose-300 bg-rose-950/50 shadow-glow-rose',
          ping: 'bg-rose-500',
          defaultLabel: 'Failed',
        };
      case 'PAUSED':
        return {
          color: 'bg-slate-400',
          ring: 'border-slate-600 text-slate-300 bg-slate-800/50',
          ping: 'bg-slate-400',
          defaultLabel: 'Paused',
        };
      case 'BLOCKED':
        return {
          color: 'bg-red-500',
          ring: 'border-red-500/50 text-red-300 bg-red-950/60 shadow-glow-rose',
          ping: 'bg-red-500',
          defaultLabel: 'Blocked by Policy',
        };
      case 'QUEUED':
        return {
          color: 'bg-blue-400',
          ring: 'border-blue-500/40 text-blue-300 bg-blue-950/50',
          ping: 'bg-blue-400',
          defaultLabel: 'Queued',
        };
      case 'IDLE':
      default:
        return {
          color: 'bg-slate-500',
          ring: 'border-slate-700 text-slate-400 bg-slate-900/50',
          ping: 'bg-slate-500',
          defaultLabel: 'Idle',
        };
    }
  };

  const config = getStatusConfig();
  const displayLabel = label || config.defaultLabel;

  const dotSize = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  };

  const containerPadding = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const content = (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border font-mono uppercase tracking-wider font-semibold select-none transition-all',
        containerPadding[size],
        config.ring,
        className
      )}
    >
      <span className="relative flex shrink-0">
        {pulse && (
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              config.ping,
              dotSize[size]
            )}
          />
        )}
        <span className={cn('relative inline-flex rounded-full', config.color, dotSize[size])} />
      </span>
      {showLabel && <span>{displayLabel}</span>}
    </div>
  );

  if (tooltipText) {
    return <Tooltip content={tooltipText}>{content}</Tooltip>;
  }

  return content;
}
