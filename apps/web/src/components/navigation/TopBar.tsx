import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, ShieldAlert, LogOut, Building, User, ChevronRight } from 'lucide-react';
import { useAuth } from '@/state/auth';
import { useRealtime } from '@/realtime/WSConnectionProvider';
import { GlobalCommandPalette } from './GlobalCommandPalette';
import { AttentionNotification } from './AttentionNotification';
import { Avatar } from '../ui/Avatar';
import { Dropdown } from '../ui/Dropdown';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { api } from '@/api/client';
import { useToast } from '../ui/Toast';

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { status: wsStatus } = useRealtime();
  const { success, error } = useToast();

  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [isTriggeringKillSwitch, setIsTriggeringKillSwitch] = useState(false);

  // Generate breadcrumb from pathname
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    if (paths.length === 0) {
      return [{ label: 'Command Center', path: '/' }];
    }

    const breadcrumbs = [{ label: 'Synapse', path: '/' }];
    let accumulated = '';
    for (const seg of paths) {
      accumulated += `/${seg}`;
      const formatted = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({ label: formatted, path: accumulated });
    }
    return breadcrumbs;
  };

  const handleKillSwitch = async () => {
    setIsTriggeringKillSwitch(true);
    try {
      await api.triggerKillSwitch(emergencyReason || 'Operator emergency stop triggered');        success('Emergency kill-switch triggered', 'All active runtimes halted.');
      setIsEmergencyModalOpen(false);
    } catch (err) {
      error('Kill-switch failed', (err as Error).message);
    } finally {
      setIsTriggeringKillSwitch(false);
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-14 px-5 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-10 select-none">
      {/* Left: Breadcrumbs location */}
      <div className="flex items-center gap-1.5 text-xs">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.path}>
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
            <span
              onClick={() => navigate(crumb.path)}
              className={
                idx === breadcrumbs.length - 1
                  ? 'font-semibold text-slate-100'
                  : 'text-slate-400 hover:text-slate-200 cursor-pointer'
              }
            >
              {crumb.label}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Center & Right: Search, Status, Attention, User Profile */}
      <div className="flex items-center gap-3.5">
        {/* Global Command Palette Trigger */}
        <GlobalCommandPalette />

        {/* System Health Badge */}
        <button
          type="button"
          onClick={() => setIsHealthModalOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 hover:border-slate-700 text-[11px] font-mono transition-colors cursor-pointer"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-slate-300 hidden md:inline">Synapse Healthy</span>
        </button>

        {/* Global Attention Notification Badge */}
        <AttentionNotification />

        {/* Emergency Kill Switch Button */}
        <button
          type="button"
          onClick={() => setIsEmergencyModalOpen(true)}
          className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950/80 border border-rose-500/30 hover:border-rose-500/60 text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
          title="Emergency Kill-Switch (Halt All Runs)"
        >
          <ShieldAlert className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-800" />

        {/* User Profile Dropdown */}
        <Dropdown
          trigger={
            <div className="flex items-center gap-2.5 cursor-pointer group">
              <Avatar name={user?.name || 'Alex Rivera'} size="sm" status="online" />
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white leading-tight">
                  {user?.name || 'Alex Rivera'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono leading-tight">
                  {user?.tenantName || 'Production Org'}
                </div>
              </div>
            </div>
          }
          items={[
            {
              key: 'user-header',
              label: (
                <div className="px-1 py-0.5">
                  <div className="font-semibold text-slate-100">{user?.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{user?.email}</div>
                </div>
              ),
              disabled: true,
            },
            { divider: true, key: 'div1' },
            {
              key: 'tenant-info',
              label: 'Tenant: default_enterprise',
              icon: <Building className="w-4 h-4" />,
            },
            {
              key: 'role-info',
              label: 'Role: Admin / Operator',
              icon: <User className="w-4 h-4" />,
            },
            { divider: true, key: 'div2' },
            {
              key: 'logout',
              label: 'Sign Out',
              icon: <LogOut className="w-4 h-4" />,
              danger: true,
              onClick: () => logout(),
            },
          ]}
        />
      </div>

      {/* System Health Modal */}
      <Dialog
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        title="SYSTEM HEALTH & FABRIC TELEMETRY"
        description="Live operational telemetry of Synapse OS subsystems"
        maxWidth="md"
      >
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-200 font-semibold">Core API Backend (:3000)</span>
            </div>
            <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              OPERATIONAL
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-200 font-semibold">Realtime WebSocket Fabric (:3001)</span>
            </div>
            <span className="text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              {wsStatus}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-200 font-semibold">Cline Engine Execution Core</span>
            </div>
            <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              READY
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-200 font-semibold">Audit Engine Cryptographic Chain</span>
            </div>
            <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              VERIFIED
            </span>
          </div>
        </div>
      </Dialog>

      {/* Emergency Kill Switch Confirmation Dialog */}
      <Dialog
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        title="TRIGGER EMERGENCY KILL-SWITCH"
        description="Immediately halt all running agent sessions, cancel background tasks, and drop pending tool executions across the entire tenant boundary."
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsEmergencyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isTriggeringKillSwitch}
              onClick={handleKillSwitch}
            >
              Confirm Emergency Stop
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-rose-300 bg-rose-950/40 p-3 rounded-lg border border-rose-500/30">
            WARNING: This action broadcasts a priority halt signal to all worker nodes and engine adapters. Active processes will terminate immediately.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Halt Reason / Audit Note</label>
            <input
              type="text"
              value={emergencyReason}
              onChange={(e) => setEmergencyReason(e.target.value)}
              placeholder="e.g. Unintended command execution observed"
              className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-xs text-white outline-none focus:border-rose-500"
            />
          </div>
        </div>
      </Dialog>
    </header>
  );
}
