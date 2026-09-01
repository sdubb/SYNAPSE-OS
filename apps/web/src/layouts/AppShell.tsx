import React from 'react';
import { Outlet } from 'react-router-dom';
import { WifiOff, AlertTriangle, ShieldAlert, RefreshCw } from 'lucide-react';
import { Sidebar } from '../components/navigation/Sidebar';
import { TopBar } from '../components/navigation/TopBar';
import { useRealtime } from '@/realtime/WSConnectionProvider';
import { useHealth } from '@/hooks/useHealth';
import { useAuth } from '@/state/auth';

export function AppShell() {
  const OutletComponent: any = Outlet;
  const { status: wsStatus, reconnect: reconnectWs } = useRealtime();
  const { isError: backendError, refetch: retryHealth } = useHealth();
  const { sessionStatus, revocationReason, logout } = useAuth();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-slate-100 antialiased font-sans">
      {/* Global Product Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Global TopBar */}
        <TopBar />

        {/* ── SECURITY / CONNECTIVITY ALERT BANNERS ── */}
        {sessionStatus === 'REVOKED' && (
          <div className="bg-rose-950/90 border-b border-rose-500/40 px-5 py-2 flex items-center justify-between text-xs font-mono text-rose-200">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>SESSION REVOKED:</strong> {revocationReason || 'Your session has been terminated by administrator security policy.'}
              </span>
            </div>
            <button
              onClick={logout}
              className="px-2.5 py-0.5 rounded bg-rose-900 border border-rose-400 hover:bg-rose-800 text-rose-100 font-bold transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        )}

        {backendError && (
          <div className="bg-rose-950/80 border-b border-rose-500/30 px-5 py-2 flex items-center justify-between text-xs font-mono text-rose-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>BACKEND UNAVAILABLE:</strong> Control plane unreachable at /api/v1. Showing authoritative cached state.
              </span>
            </div>
            <button
              onClick={() => retryHealth()}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-rose-900/80 border border-rose-500/50 hover:bg-rose-800 text-rose-100 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Retry Connection
            </button>
          </div>
        )}

        {wsStatus === 'UNAUTHORIZED' && (
          <div className="bg-amber-950/80 border-b border-amber-500/30 px-5 py-2 flex items-center justify-between text-xs font-mono text-amber-200">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>WEBSOCKET UNAUTHORIZED (4001):</strong> Realtime telemetry rejected. Authentication token may be expired or revoked.
              </span>
            </div>
            <button
              onClick={logout}
              className="px-2.5 py-0.5 rounded bg-amber-900/80 border border-amber-500/50 hover:bg-amber-800 text-amber-100 transition-colors cursor-pointer"
            >
              Re-authenticate
            </button>
          </div>
        )}

        {wsStatus === 'RECONNECTING' && (
          <div className="bg-slate-900/90 border-b border-amber-500/20 px-5 py-1.5 flex items-center justify-between text-[11px] font-mono text-amber-300">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>Realtime WebSocket disconnected. Attempting automatic reconnection...</span>
            </div>
            <button
              onClick={() => reconnectWs()}
              className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              Reconnect Now
            </button>
          </div>
        )}

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto bg-background p-6 cyber-grid">
          <div className="max-w-7xl mx-auto w-full">
            <OutletComponent />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
