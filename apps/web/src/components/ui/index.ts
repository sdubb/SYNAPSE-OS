import React from 'react';
import { StatusIndicator } from '../product/StatusIndicator';

export * from './Button';
export * from './Input';
export * from './Textarea';
export * from './Select';
export * from './Tabs';
export * from './Dialog';
export { Dialog as Modal } from './Dialog';
export * from './Drawer';
export * from './Popover';
export * from './Tooltip';
export * from './Dropdown';
export * from './Badge';
export * from './Avatar';
export * from './Card';
export * from './Table';
export * from './Toast';
export * from './Alert';
export * from './Progress';
export * from './Skeleton';
export * from './EmptyState';
export * from './CommandPalette';
export * from '../product/RiskBadge';
export * from '../product/StatusIndicator';


// Additional convenient alias components using React.createElement for pure .ts file
export const StatusBadge: React.FC<{ status: string; className?: string; size?: 'sm' | 'md' }> = ({
  status,
  className,
  size = 'md',
}) => React.createElement(StatusIndicator, { status, className, size: size === 'sm' ? 'sm' : 'md' });

export const MetricCard: React.FC<{
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
}> = ({ title, value, subtitle, icon, trend, trendPositive }) =>
  React.createElement(
    'div',
    { className: 'bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between' },
    React.createElement(
      'div',
      { className: 'flex items-center justify-between text-slate-400 mb-2' },
      React.createElement('span', { className: 'text-xs font-semibold uppercase tracking-wider' }, title),
      icon && React.createElement('div', { className: 'text-cyan-400 p-1.5 rounded-lg bg-slate-800/60' }, icon)
    ),
    React.createElement(
      'div',
      null,
      React.createElement('div', { className: 'text-2xl font-bold text-slate-100 font-mono tracking-tight' }, value),
      (subtitle || trend) &&
        React.createElement(
          'div',
          { className: 'flex items-center gap-2 mt-1 text-xs text-slate-400' },
          trend &&
            React.createElement(
              'span',
              { className: `font-mono font-medium ${trendPositive ? 'text-emerald-400' : 'text-rose-400'}` },
              trend
            ),
          subtitle && React.createElement('span', null, subtitle)
        )
    )
  );

export const StatMetric = MetricCard;

export const VerdictBadge: React.FC<{ verdict: string; className?: string }> = ({ verdict, className = '' }) => {
  const v = (verdict || '').toUpperCase();
  if (v === 'PASS' || v === 'PASSED') {
    return React.createElement(
      'span',
      {
        className: `inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 ${className}`,
      },
      '✓ PASS'
    );
  }
  if (v === 'FAIL' || v === 'FAILED') {
    return React.createElement(
      'span',
      {
        className: `inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800 ${className}`,
      },
      '✕ FAIL'
    );
  }
  return React.createElement(
    'span',
    {
      className: `inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800 ${className}`,
    },
    `⚠ ${v || 'REVIEW'}`
  );
};

export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const norm = (priority || '').toLowerCase();
  let bg = 'bg-slate-800 text-slate-300 border-slate-700';
  if (norm === 'emergency' || norm === 'critical') bg = 'bg-rose-950/60 text-rose-300 border-rose-500/40';
  else if (norm === 'high') bg = 'bg-orange-950/60 text-orange-300 border-orange-500/40';
  else if (norm === 'medium') bg = 'bg-blue-950/60 text-blue-300 border-blue-500/40';
  else if (norm === 'low') bg = 'bg-slate-900 text-slate-400 border-slate-700';

  return React.createElement(
    'span',
    {
      className: `inline-flex items-center font-mono uppercase text-[11px] px-2 py-0.5 rounded border font-semibold ${bg}`,
    },
    priority
  );
};
