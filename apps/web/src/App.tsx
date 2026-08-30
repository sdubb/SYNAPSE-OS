import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';

// Feature Pages
import { MissionsPage } from './features/missions/MissionsPage';
import { MissionDetailPage } from './features/missions/MissionDetailPage';
import { ExecutionGraphPage } from './features/graph/ExecutionGraphPage';
import { VersionComparisonPage } from './features/graph/VersionComparisonPage';
import { WorkforcePage } from './features/workforce/WorkforcePage';
import { SimulationPage } from './features/simulation/SimulationPage';
import { ApprovalsPage } from './features/approvals/ApprovalsPage';
import { EscalationsPage } from './features/escalations/EscalationsPage';
import { AuditPage } from './features/audit/AuditPage';
import { RuntimeDetailPage } from './features/runtime/RuntimeDetailPage';

const RoutesComp = Routes as unknown as React.ComponentType<any>;
const RouteComp = Route as unknown as React.ComponentType<any>;
const NavigateComp = Navigate as unknown as React.ComponentType<any>;

export function App() {
  return (
    <RoutesComp>
      <RouteComp element={<AppShell />}>
        {/* Default → Mission Command Center */}
        <RouteComp path="/" element={<NavigateComp to="/missions" replace />} />

        {/* 1. Mission Command Center */}
        <RouteComp path="/missions" element={<MissionsPage />} />
        <RouteComp path="/missions/:id" element={<MissionDetailPage />} />

        {/* 2. Execution Graph */}
        <RouteComp path="/graph" element={<ExecutionGraphPage />} />
        <RouteComp path="/graph/versions" element={<VersionComparisonPage />} />

        {/* 3. Workforce */}
        <RouteComp path="/workforce" element={<WorkforcePage />} />

        {/* 4. Simulation */}
        <RouteComp path="/simulation" element={<SimulationPage />} />

        {/* 5. Approvals */}
        <RouteComp path="/approvals" element={<ApprovalsPage />} />

        {/* 6. Escalations */}
        <RouteComp path="/escalations" element={<EscalationsPage />} />

        {/* 7. Audit */}
        <RouteComp path="/audit" element={<AuditPage />} />

        {/* 8. Runtime Details */}
        <RouteComp path="/runtime/:id" element={<RuntimeDetailPage />} />

        {/* Fallback */}
        <RouteComp path="*" element={<NavigateComp to="/missions" replace />} />
      </RouteComp>
    </RoutesComp>
  );
}

export default App;
