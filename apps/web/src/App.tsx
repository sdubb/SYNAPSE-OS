import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';

// Core Focused Feature Pages
import { OperatorPage } from './features/operator/OperatorPage';
import { TasksPage } from './features/tasks/TasksPage';
import { TaskDetailPage } from './features/tasks/TaskDetailPage';
import { AgentsPage } from './features/agents/AgentsPage';
import { AgentDetailPage } from './features/agents/AgentDetailPage';
import { ApprovalsPage } from './features/governance/ApprovalsPage';
import { PoliciesPage } from './features/governance/PoliciesPage';
import { AuditPage } from './features/governance/AuditPage';

const RoutesComp = Routes as unknown as React.ComponentType<any>;
const RouteComp = Route as unknown as React.ComponentType<any>;
const NavigateComp = Navigate as unknown as React.ComponentType<any>;

export function App() {
  return (
    <RoutesComp>
      <RouteComp element={<AppShell />}>
        {/* Default route points directly to Operator CLI */}
        <RouteComp path="/" element={<NavigateComp to="/operator" replace />} />

        {/* 1. Operator: Conversational CLI & Steer */}
        <RouteComp path="/operator" element={<OperatorPage />} />
        <RouteComp path="/operator/:id" element={<OperatorPage />} />

        {/* 2. Tasks: Autonomous Kanban Pipeline */}
        <RouteComp path="/tasks" element={<TasksPage />} />
        <RouteComp path="/tasks/:id" element={<TaskDetailPage />} />

        {/* 3. Agents: Agent Catalog & Sub-Agent Trees */}
        <RouteComp path="/agents" element={<AgentsPage />} />
        <RouteComp path="/agents/:id" element={<AgentDetailPage />} />

        {/* 4. Governance: Approvals, Policies & SHA-256 Audit Chain */}
        <RouteComp path="/governance" element={<ApprovalsPage />} />
        <RouteComp path="/governance/approvals" element={<ApprovalsPage />} />
        <RouteComp path="/governance/policies" element={<PoliciesPage />} />
        <RouteComp path="/governance/audit" element={<AuditPage />} />

        {/* Fallback */}
        <RouteComp path="*" element={<NavigateComp to="/operator" replace />} />
      </RouteComp>
    </RoutesComp>
  );
}

export default App;
