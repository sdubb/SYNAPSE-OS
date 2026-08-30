import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  GitBranch,
  Users,
  FlaskConical,
  ShieldCheck,
  AlertTriangle,
  ScrollText,
  Cpu,
  Network,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealtime } from '@/realtime/WSConnectionProvider';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const location = useLocation();
  const { status: wsStatus } = useRealtime();

  const sections: NavSection[] = [
    {
      title: 'OPERATOR',
      items: [
        { label: 'Missions', path: '/missions', icon: <Activity className="w-4 h-4 shrink-0" /> },
        { label: 'Execution Graph', path: '/graph', icon: <GitBranch className="w-4 h-4 shrink-0" /> },
        { label: 'Graph Versions', path: '/graph/versions', icon: <GitBranch className="w-4 h-4 shrink-0" /> },
        { label: 'Workforce', path: '/workforce', icon: <Users className="w-4 h-4 shrink-0" /> },
        { label: 'Simulation', path: '/simulation', icon: <FlaskConical className="w-4 h-4 shrink-0" /> },
      ],
    },
    {
      title: 'GOVERNANCE',
      items: [
        { label: 'Approvals', path: '/approvals', icon: <ShieldCheck className="w-4 h-4 shrink-0" /> },
        { label: 'Escalations', path: '/escalations', icon: <AlertTriangle className="w-4 h-4 shrink-0" /> },
        { label: 'Audit Trail', path: '/audit', icon: <ScrollText className="w-4 h-4 shrink-0" /> },
      ],
    },
  ];

  return (
    <aside className="w-60 h-screen bg-slate-950/90 border-r border-slate-800 flex flex-col shrink-0 select-none z-20 overflow-y-auto">
      {/* Brand */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-slate-800 shrink-0 bg-slate-950">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center">
          <Network className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-wide text-white font-mono">SYNAPSE</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 font-mono border border-cyan-500/30">OS</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">Operator Console</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-2 py-4 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              {section.title}
            </div>
            <nav className="space-y-0.5 pt-1">
              {section.items.map((item) => {
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
                    )}
                  >
                    <span className={cn(isActive ? 'text-cyan-400' : 'text-slate-400')}>{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Connection Status Footer */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={cn(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  wsStatus === 'CONNECTED' ? 'bg-emerald-400' : 'bg-amber-400'
                )} />
                <span className={cn(
                  'relative inline-flex rounded-full h-2 w-2',
                  wsStatus === 'CONNECTED' ? 'bg-emerald-500' : 'bg-amber-500'
                )} />
              </span>
              <span className="text-[11px] font-semibold text-slate-200">SYNAPSE</span>
            </div>
            <span className={cn(
              'text-[10px] font-mono px-1.5 py-0.2 rounded',
              wsStatus === 'CONNECTED'
                ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30'
                : 'text-amber-400 bg-amber-950/60 border border-amber-500/30'
            )}>
              {wsStatus === 'CONNECTED' ? 'CONNECTED' : wsStatus}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
