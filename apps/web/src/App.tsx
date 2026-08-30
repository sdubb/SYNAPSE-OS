import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { useAuth } from './state/auth';

// Auth
import { LoginPage } from './features/auth/LoginPage';

// Feature Pages
import { MissionsPage } from './features/missions/MissionsPage';
import { MissionDetailPage } from './features/missions/MissionDetailPage';
import { ExecutionGraphPage } from './features/graph/ExecutionGraphPage';
import { WorkforcePage } from './features/workforce/WorkforcePage';
import { SimulationPage } from './features/simulation/SimulationPage';
import { ApprovalsPage } from './features/approvals/ApprovalsPage';
import { EscalationsPage } from './features/escalations/EscalationsPage';
import { AuditPage } from './features/audit/AuditPage';
import { RuntimeDetailPage } from './features/runtime/RuntimeDetailPage';
import { ProviderSettingsPage } from './features/settings/ProviderSettingsPage';

const RoutesComp = Routes as unknown as React.ComponentType<any>;
const RouteComp = Route as unknown as React.ComponentType<any>;
const NavigateComp = Navigate as unknown as React.ComponentType<any>;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-mono">Initializing...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <NavigateComp to="/login" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <RoutesComp>
      {/* Public: Login */}
      <RouteComp path="/login" element={<LoginPage />} />

      {/* Protected: App */}
      <RouteComp
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        {/* Default → Mission Command Center */}
        <RouteComp index element={<NavigateComp to="/missions" replace />} />

        {/* Mission Command */}
        <RouteComp path="missions" element={<MissionsPage />} />
        <RouteComp path="missions/:id" element={<MissionDetailPage />} />

        {/* Execution Graph */}
        <RouteComp path="graph" element={<ExecutionGraphPage />} />

        {/* Workforce */}
        <RouteComp path="workforce" element={<WorkforcePage />} />

        {/* Simulation */}
        <RouteComp path="simulation" element={<SimulationPage />} />

        {/* Governance */}
        <RouteComp path="approvals" element={<ApprovalsPage />} />
        <RouteComp path="escalations" element={<EscalationsPage />} />
        <RouteComp path="audit" element={<AuditPage />} />

        {/* Runtime Detail */}
        <RouteComp path="runtime/:id" element={<RuntimeDetailPage />} />

        {/* Settings */}
        <RouteComp path="settings/providers" element={<ProviderSettingsPage />} />
      </RouteComp>

      {/* Fallback */}
      <RouteComp path="*" element={<NavigateComp to="/missions" replace />} />
    </RoutesComp>
  );
}

export default App;
