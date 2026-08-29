import React, { ReactNode } from 'react';
import { VerificationVerdict } from '../../types/trust-governance.js';

export function Badge({ children, variant = 'default', className = '' }: {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'cyan';
  className?: string;
}) {
  const styles: Record<string, string> = {
    default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    success: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 shadow-sm shadow-emerald-900/20',
    warning: 'bg-amber-950/80 text-amber-300 border-amber-700/60 shadow-sm shadow-amber-900/20',
    danger: 'bg-rose-950/80 text-rose-300 border-rose-700/60 shadow-sm shadow-rose-900/20',
    info: 'bg-sky-950/80 text-sky-300 border-sky-700/60 shadow-sm shadow-sky-900/20',
    purple: 'bg-purple-950/80 text-purple-300 border-purple-700/60 shadow-sm shadow-purple-900/20',
    cyan: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60 shadow-sm shadow-cyan-900/20',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function RiskBadge({ level }: { level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string }) {
  const norm = (level || '').toUpperCase();
  switch (norm) {
    case 'CRITICAL':
      return <Badge variant="danger"><span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />CRITICAL</Badge>;
    case 'HIGH':
      return <Badge variant="warning"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />HIGH</Badge>;
    case 'MEDIUM':
      return <Badge variant="info"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" />MEDIUM</Badge>;
    case 'LOW':
    default:
      return <Badge variant="success"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />LOW</Badge>;
  }
}

export function VerdictBadge({ verdict }: { verdict: VerificationVerdict | string }) {
  switch (verdict) {
    case 'PASS':
      return <Badge variant="success">✓ PASS</Badge>;
    case 'FAIL':
      return <Badge variant="danger">✕ FAIL</Badge>;
    case 'REVIEW':
      return <Badge variant="warning">⚠ REVIEW</Badge>;
    case 'SKIPPED':
      return <Badge variant="default">⊘ SKIPPED</Badge>;
    case 'INCONCLUSIVE':
    default:
      return <Badge variant="info">? INCONCLUSIVE</Badge>;
  }
}

export function Card({
  title,
  subtitle,
  children,
  action,
  actions,
  className = '',
  headerClassName = '',
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  actions?: ReactNode;
  className?: string;
  headerClassName?: string;
}) {
  const act = action || actions;
  return (
    <div className={`bg-zinc-900/90 border border-zinc-800/80 rounded-xl overflow-hidden backdrop-blur-md transition-all duration-150 hover:border-zinc-700/80 ${className}`}>
      {(title || subtitle || act) && (
        <div className={`px-5 py-4 border-b border-zinc-800/60 flex items-center justify-between gap-4 ${headerClassName}`}>
          <div>
            {title && <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
          {act && <div>{act}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function StatMetric({
  label,
  value,
  change,
  variant = 'default',
  icon,
}: {
  label: string;
  value: string | number;
  change?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'cyan';
  icon?: ReactNode;
}) {
  const textColors: Record<string, string> = {
    default: 'text-zinc-100',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-rose-400',
    cyan: 'text-cyan-400',
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700/70 transition-all">
      <div className="flex items-center justify-between text-zinc-400 text-xs font-medium uppercase tracking-wider mb-2">
        <span>{label}</span>
        {icon && <div className="text-zinc-400">{icon}</div>}
      </div>
      <div className="flex items-baseline justify-between">
        <span className={`text-2xl font-bold font-mono ${textColors[variant]}`}>{value}</span>
        {change && <span className="text-xs text-zinc-400 font-mono">{change}</span>}
      </div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: (e?: any) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}) {
  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const variantStyles = {
    primary: 'bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-md shadow-cyan-500/20 disabled:opacity-50',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 disabled:opacity-50',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 disabled:opacity-50',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50',
    ghost: 'hover:bg-zinc-800/80 text-zinc-300 disabled:opacity-50',
    outline: 'border border-zinc-700 hover:border-zinc-500 text-zinc-200 bg-transparent disabled:opacity-50',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition-all active:scale-[0.98] disabled:pointer-events-none cursor-pointer ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className={`bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full ${maxWidth} shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded-md hover:bg-zinc-800 transition"
          >
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
