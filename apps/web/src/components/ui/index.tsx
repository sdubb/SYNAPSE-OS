import React, { ReactNode, InputHTMLAttributes, ButtonHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { RunStatus, TaskStatus, TaskPriority, RiskLevel, AgentHealthStatus, ApprovalStatus } from '../../types/index.js';
import {
  CheckCircle2,
  Clock,
  Play,
  Pause,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  HelpCircle,
  RotateCw,
  Search,
  ExternalLink,
  ChevronRight,
  Activity,
  Layers,
  Zap,
  Terminal,
  Shield,
  FileCode,
  ArrowUpRight,
  X,
} from 'lucide-react';

/* =========================================================
   STATUS BADGES & INDICATORS
   ========================================================= */

export const StatusBadge: React.FC<{
  status: RunStatus | TaskStatus | ApprovalStatus | AgentHealthStatus | string;
  className?: string;
  size?: 'sm' | 'md';
}> = ({ status, className = '', size = 'md' }) => {
  const norm = (status || '').toLowerCase();

  let bg = 'bg-slate-800/80 text-slate-300 border-slate-700';
  let dot = 'bg-slate-400';
  let label = status;

  if (['running', 'active', 'busy'].includes(norm)) {
    bg = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 animate-pulse';
    dot = 'bg-emerald-400';
  } else if (['verifying', 'verification', 'review'].includes(norm)) {
    bg = 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40';
    dot = 'bg-cyan-400';
  } else if (['completed', 'pass', 'approved', 'auto_approved', 'healthy'].includes(norm)) {
    bg = 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30';
    dot = 'bg-emerald-400';
  } else if (['waiting', 'awaiting_approval', 'awaiting_input', 'pending', 'paused'].includes(norm)) {
    bg = 'bg-amber-950/60 text-amber-300 border-amber-500/40';
    dot = 'bg-amber-400';
  } else if (['failed', 'fail', 'rejected', 'error', 'aborted', 'cancelled', 'terminated'].includes(norm)) {
    bg = 'bg-rose-950/60 text-rose-300 border-rose-500/40';
    dot = 'bg-rose-400';
  } else if (['backlog', 'ready', 'planned', 'queued', 'idle', 'initializing'].includes(norm)) {
    bg = 'bg-indigo-950/50 text-indigo-300 border-indigo-500/30';
    dot = 'bg-indigo-400';
  }

  const py = size === 'sm' ? 'py-0.5 px-2 text-xs' : 'py-1 px-2.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${py} ${bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="capitalize">{label}</span>
    </span>
  );
};

export const RiskBadge: React.FC<{
  risk?: RiskLevel | string;
  level?: RiskLevel | string;
  size?: 'sm' | 'md';
}> = ({ risk, level, size = 'md' }) => {
  const actualRisk = risk || level || 'LOW';
  const norm = (actualRisk || '').toLowerCase();
  let bg = 'bg-slate-800 text-slate-300 border-slate-700';
  if (norm === 'low') bg = 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30';
  else if (norm === 'medium') bg = 'bg-amber-950/50 text-amber-300 border-amber-500/30';
  else if (norm === 'high') bg = 'bg-orange-950/50 text-orange-300 border-orange-500/30';
  else if (norm === 'critical') bg = 'bg-rose-950/60 text-rose-300 border-rose-500/40 animate-pulse';

  const py = size === 'sm' ? 'py-0.5 px-1.5 text-[10px]' : 'py-0.5 px-2 text-xs';

  return (
    <span className={`inline-flex items-center gap-1 font-mono uppercase font-semibold rounded border ${py} ${bg}`}>
      <Shield className="w-3 h-3" />
      {actualRisk}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: TaskPriority | string }> = ({ priority }) => {
  const norm = (priority || '').toLowerCase();
  let bg = 'bg-slate-800 text-slate-300 border-slate-700';
  if (norm === 'emergency' || norm === 'critical')
    bg = 'bg-rose-950/60 text-rose-300 border-rose-500/40';
  else if (norm === 'high') bg = 'bg-orange-950/60 text-orange-300 border-orange-500/40';
  else if (norm === 'medium') bg = 'bg-blue-950/60 text-blue-300 border-blue-500/40';
  else if (norm === 'low') bg = 'bg-slate-900 text-slate-400 border-slate-700';

  return (
    <span className={`inline-flex items-center font-mono uppercase text-[11px] px-2 py-0.5 rounded border font-semibold ${bg}`}>
      {priority}
    </span>
  );
};

/* =========================================================
   BUTTON COMPONENT
   ========================================================= */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  let baseStyle =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed select-none gap-2';

  let sizeStyle = 'px-3.5 py-1.5 text-sm';
  if (size === 'sm') sizeStyle = 'px-2.5 py-1 text-xs';
  if (size === 'lg') sizeStyle = 'px-5 py-2.5 text-base';

  let variantStyle = 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600';
  if (variant === 'primary') {
    variantStyle =
      'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-950/50 border border-cyan-400/30';
  } else if (variant === 'danger') {
    variantStyle = 'bg-rose-700/80 hover:bg-rose-600 text-white border border-rose-500/40 shadow-sm';
  } else if (variant === 'ghost') {
    variantStyle = 'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white border-transparent';
  } else if (variant === 'outline') {
    variantStyle = 'bg-transparent hover:bg-slate-800/40 text-cyan-400 border border-cyan-500/40 hover:border-cyan-400';
  } else if (variant === 'success') {
    variantStyle = 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/30';
  }

  return (
    <button
      className={`${baseStyle} ${sizeStyle} ${variantStyle} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <RotateCw className="w-4 h-4 animate-spin text-current" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};

/* =========================================================
   FORM INPUTS
   ========================================================= */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', id, ...props }) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && <div className="absolute left-3 text-slate-400 pointer-events-none">{icon}</div>}
        <input
          id={inputId}
          className={`w-full bg-slate-900/90 text-slate-100 placeholder-slate-500 rounded-lg border border-slate-700/80 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors text-sm px-3 py-2 ${
            icon ? 'pl-9' : ''
          } ${error ? 'border-rose-500' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
};

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className = '', id, ...props }) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`w-full bg-slate-900/90 text-slate-100 placeholder-slate-500 rounded-lg border border-slate-700/80 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors text-sm px-3 py-2 ${
          error ? 'border-rose-500' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
};

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, className = '', id, ...props }) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={`w-full bg-slate-900/90 text-slate-100 rounded-lg border border-slate-700/80 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors text-sm px-3 py-2 cursor-pointer ${
          error ? 'border-rose-500' : ''
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
};

/* =========================================================
   CARD COMPONENT
   ========================================================= */

export const Card: React.FC<{
  children: ReactNode;
  className?: string;
  title?: string | ReactNode;
  subtitle?: string | ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  action?: ReactNode;
  onClick?: () => void;
  hoverable?: boolean;
}> = ({ children, className = '', title, subtitle, badge, actions, action, onClick, hoverable = false }) => {
  const actualActions = actions || action;
  return (
    <div
      onClick={onClick}
      className={`bg-slate-900/80 border border-slate-800/90 rounded-xl overflow-hidden backdrop-blur-sm shadow-md transition-all ${
        hoverable ? 'hover:border-slate-700 hover:shadow-cyan-950/20 hover:scale-[1.005] cursor-pointer' : ''
      } ${className}`}
    >
      {(title || actualActions || badge) && (
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-slate-900/40">
          <div>
            {typeof title === 'string' ? (
              <h3 className="font-semibold text-slate-100 text-sm tracking-tight flex items-center gap-2">{title}</h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {badge}
            {actualActions}
          </div>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};

/* =========================================================
   MODAL / DIALOG COMPONENT
   ========================================================= */

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  description?: string | ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}> = ({ isOpen, onClose, title, subtitle, description, children, footer, maxWidth = '2xl' }) => {
  if (!isOpen) return null;

  const actualSubtitle = subtitle || description;

  let maxWClass = 'max-w-2xl';
  if (maxWidth === 'sm') maxWClass = 'max-w-sm';
  if (maxWidth === 'md') maxWClass = 'max-w-md';
  if (maxWidth === 'lg') maxWClass = 'max-w-lg';
  if (maxWidth === 'xl') maxWClass = 'max-w-xl';
  if (maxWidth === '3xl') maxWClass = 'max-w-3xl';
  if (maxWidth === '4xl') maxWClass = 'max-w-4xl';
  if (maxWidth === '5xl') maxWClass = 'max-w-5xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        className={`bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full ${maxWClass} my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            {typeof title === 'string' ? <h3 className="font-bold text-slate-100 text-base">{title}</h3> : title}
            {actualSubtitle && (typeof actualSubtitle === 'string' ? <p className="text-xs text-slate-400 mt-0.5">{actualSubtitle}</p> : actualSubtitle)}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>

        {footer && <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
};

export const Dialog = Modal;

/* =========================================================
   TABS COMPONENT
   ========================================================= */

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  risk?: RiskLevel;
}

export const Tabs: React.FC<{
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`flex items-center gap-1 border-b border-slate-800/90 overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap select-none ${
              isActive
                ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
            }`}
          >
            {tab.icon && <span className="w-4 h-4 flex items-center justify-center">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.badge}
              </span>
            )}
            {tab.risk && (
              <span className="ml-1">
                <RiskBadge risk={tab.risk} size="sm" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/* =========================================================
   METRIC STAT CARD
   ========================================================= */

export const MetricCard: React.FC<{
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  trend?: string;
  trendPositive?: boolean;
}> = ({ title, value, subtitle, icon, trend, trendPositive }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between text-slate-400 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
        {icon && <div className="text-cyan-400 p-1.5 rounded-lg bg-slate-800/60">{icon}</div>}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-100 font-mono tracking-tight">{value}</div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
            {trend && (
              <span className={`font-mono font-medium ${trendPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trend}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================================================
   EMPTY STATE
   ========================================================= */

export const EmptyState: React.FC<{
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}> = ({ icon = <Layers className="w-10 h-10 text-slate-500" />, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl">
      <div className="p-3 bg-slate-800/50 rounded-2xl mb-3 text-cyan-400">{icon}</div>
      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">{description}</p>
      {action}
    </div>
  );
};

export const StatMetric = MetricCard;

export const VerdictBadge: React.FC<{ verdict: string; className?: string }> = ({ verdict, className = '' }) => {
  const v = (verdict || '').toUpperCase();
  if (v === 'PASS' || v === 'PASSED') {
    return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 ${className}`}>✓ PASS</span>;
  }
  if (v === 'FAIL' || v === 'FAILED') {
    return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800 ${className}`}>✕ FAIL</span>;
  }
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800 ${className}`}>⚠ {v || 'REVIEW'}</span>;
};

export const Badge: React.FC<{ variant?: string; className?: string; children: React.ReactNode }> = ({ variant = 'default', className = '', children }) => {
  let bg = 'bg-slate-800 text-slate-300 border-slate-700';
  if (variant === 'success') bg = 'bg-emerald-950 text-emerald-400 border-emerald-800';
  if (variant === 'warning') bg = 'bg-amber-950 text-amber-400 border-amber-800';
  if (variant === 'danger' || variant === 'destructive') bg = 'bg-rose-950 text-rose-400 border-rose-800';
  if (variant === 'info' || variant === 'cyan') bg = 'bg-cyan-950 text-cyan-400 border-cyan-800';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${bg} ${className}`}>{children}</span>;
};
