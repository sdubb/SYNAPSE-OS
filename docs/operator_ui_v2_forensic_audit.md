# SYNAPSE-OS — OPERATOR UI V2 FORENSIC PRODUCT AUDIT

**Milestone**: `f09a838` (HEAD)  
**Evaluated Application**: `apps/web` (React 18 + Vite + TailwindCSS)  
**Objective**: Complete forensic audit of routes, pages, components, hooks, API client, WebSocket fabric, and state management.

---

## 1. Executive Summary & Capabilities Classification

The current frontend (`apps/web`) provides a solid foundational dark-mode shell with real API bindings and a WebSocket event bus. However, the UI operates largely as disconnected tabular metadata pages rather than a cohesive, mission-centric **Command Center**.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND CAPABILITY CLASSIFICATION MATRIX                   │
├───────────────────────────────┬──────────────────────────────────────────────────┤
│ REAL + VERIFIED               │ • Sessions / Missions list & detail API bindings │
│                               │ • Tool Approvals resolution (APPROVE / REJECT)   │
│                               │ • Audit trail log viewer with SHA-256 hashes     │
│                               │ • WebSocket connection status & live ping        │
│                               │ • Emergency kill-switch trigger modal            │
│                               │ • Real-time event subscription hook              │
├───────────────────────────────┼──────────────────────────────────────────────────┤
│ REAL + UNVERIFIED             │ • Tasks list and creation endpoints              │
│                               │ • Agent definitions list and create              │
│                               │ • World Model entity/relationship queries        │
├───────────────────────────────┼──────────────────────────────────────────────────┤
│ BACKEND AVAILABLE BUT         │ • Live interactive DAG with execution frontier   │
│ UI MISSING                    │ • Node Inspector drawer with tool/evidence logs  │
│                               │ • Prediction vs Reality accuracy comparator      │
│                               │ • Multi-agent Workforce Kanban board             │
│                               │ • Persistent "Needs You" human-in-the-loop tray  │
│                               │ • Forensic Evidence Chain drilldown (SHA-256)    │
│                               │ • "Show Me What the Agents Did" report generator │
│                               │ • MCP connected agents telemetry & breakdown     │
├───────────────────────────────┼──────────────────────────────────────────────────┤
│ CONFUSING / FRAGMENTED        │ • Graph page separated from Mission Cockpit      │
│                               │ • Escalations page disconnected from Missions    │
│                               │ • Simulation page showing static raw cards       │
│                               │ • Workforce page showing simple list vs Kanban   │
├───────────────────────────────┼──────────────────────────────────────────────────┤
│ PLACEHOLDER / DUMMY CONTENT   │ • ZERO found in data models (Verified real)      │
│                               │ • Toast ID generator uses Math.random() (safe)   │
└───────────────────────────────┴──────────────────────────────────────────────────┘
```

---

## 2. Forensic Route-by-Route Inspection

### Route: `/missions` (`features/missions/MissionsPage.tsx`)
- **Backend API**: `GET /api/v1/sessions`, `GET /api/v1/tasks`, `GET /api/v1/agents`, `GET /api/v1/approvals`, `GET /api/v1/audit`
- **Mutations**: None on list page.
- **States**: Skeleton loading, Empty state with icon, Real-time active status dots with pulse animations.
- **Assessment**: `REAL + VERIFIED`. Correctly displays active/completed/failed sessions and operational metrics.
- **Gaps**: Lacks quick-filter by risk level, lacks global mission summary breakdown.

### Route: `/missions/:id` (`features/missions/MissionDetailPage.tsx`)
- **Backend API**: `GET /api/v1/sessions/:id`, `GET /api/v1/sessions/:id/timeline`, `GET /api/v1/sessions/:id/messages`, `GET /api/v1/sessions/:id/usage`
- **Mutations**: `POST /sessions/:id/pause`, `POST /sessions/:id/resume`, `POST /sessions/:id/stop`, `POST /sessions/:id/interventions`
- **States**: Loading skeletons, Honest error displays, Timeline category filters.
- **Assessment**: `REAL + VERIFIED`. Has live control buttons (Pause, Resume, Stop, Intervene).
- **Gaps**: Graph is not visually prominent; does not highlight Cline as Primary Brain vs External MCP Agents; does not display Prediction vs Reality delta.

### Route: `/graph` (`features/graph/ExecutionGraphPage.tsx`)
- **Backend API**: `GET /api/v1/sessions` (reads graph structure from active session or query params).
- **Layout**: Custom layered BFS topological layout algorithm.
- **States**: Interactive node selection, zoom in/out, pan.
- **Assessment**: `CONFUSING`. The graph is an isolated route rather than embedded inside the Mission Cockpit where the operator needs it. Node inspector lacks full audit and evidence hash chain.

### Route: `/workforce` (`features/workforce/WorkforcePage.tsx`)
- **Backend API**: `GET /api/v1/agents`, `GET /api/v1/sessions`
- **Assessment**: `LOW-VALUE / CONFUSING`. Renders a simple flat list of agent cards. Does not provide a multi-column Kanban board organized by agent lifecycle states (`PLANNING`, `EXECUTING`, `SIMULATING`, `APPROVAL`, `BLOCKED`, `ESCALATED`, `COMPLETED`).

### Route: `/simulation` (`features/simulation/SimulationPage.tsx`)
- **Backend API**: `GET /api/v1/simulations`
- **Assessment**: `REAL + UNVERIFIED / CONFUSING`. Renders raw simulation JSON cards. Does not visualize the Monte Carlo distribution, twin state isolation, or compare simulated failure probability against actual observed outcome.

### Route: `/approvals` (`features/approvals/ApprovalsPage.tsx`)
- **Backend API**: `GET /api/v1/approvals`, `POST /api/v1/approvals/:id/resolve`
- **Mutations**: Resolves approvals with `APPROVED` or `REJECTED` and custom reason string.
- **Assessment**: `REAL + VERIFIED`. Fully functional with real backend mutation confirmation.

### Route: `/escalations` (`features/escalations/EscalationsPage.tsx`)
- **Realtime**: Subscribes to `graph.escalation.required` via WebSocket.
- **Assessment**: `REAL + VERIFIED`. Live event stream with Level 1–4 badges.
- **Gaps**: Does not link directly to the affected graph node in the Mission Cockpit.

### Route: `/audit` (`features/audit/AuditPage.tsx`)
- **Backend API**: `GET /api/v1/audit?limit=50&eventType=...`
- **Assessment**: `REAL + VERIFIED`. Displays SHA-256 hash chains, sequence numbers, actor IDs, and severity.

---

## 3. Hook & API Layer Forensic Audit

| Hook File | Endpoint / Protocol | Data Shape | Error Handling | Loading State | Real Runtime |
|---|---|---|:---:|:---:|:---:|
| [`useSessions.ts`](file:///C:/Users/lenovo/OneDrive/Desktop/os/apps/web/src/hooks/useSessions.ts) | `GET /api/v1/sessions` | `SynapseSession[]` | Yes (`onError`) | Yes (`isLoading`) | **YES** |
| [`useTasks.ts`](file:///C:/Users/lenovo/OneDrive/Desktop/os/apps/web/src/hooks/useTasks.ts) | `GET /api/v1/tasks` | `SynapseTask[]` | Yes | Yes | **YES** |
| [`useAgents.ts`](file:///C:/Users/lenovo/OneDrive/Desktop/os/apps/web/src/hooks/useAgents.ts) | `GET /api/v1/agents` | `AgentDefinition[]` | Yes | Yes | **YES** |
| [`useApprovals.ts`](file:///C:/Users/lenovo/OneDrive/Desktop/os/apps/web/src/hooks/useApprovals.ts) | `GET /api/v1/approvals` | `ToolApprovalRequest[]` | Yes | Yes | **YES** |
| [`useAudit.ts`](file:///C:/Users/lenovo/OneDrive/Desktop/os/apps/web/src/hooks/useAudit.ts) | `GET /api/v1/audit` | `{ records, total }` | Yes | Yes | **YES** |
| [`useSimulations.ts`](file:///C:/Users/lenovo/OneDrive/Desktop/os/apps/web/src/hooks/useSimulations.ts) | `GET /api/v1/simulations` | `SimulationRun[]` | Yes | Yes | **YES** |
| [`WSConnectionProvider.tsx`](file:///C:/Users/lenovo/OneDrive/Desktop/os/apps/web/src/realtime/WSConnectionProvider.tsx) | `ws://localhost:3001/ws` | `SynapseRealtimeEvent` | Reconnect backoff | Connection status | **YES** |

---

## 4. WebSocket & Real-Time Fabric Inspection

In [`apps/web/src/realtime/WSConnectionProvider.tsx`](file:///C:/Users/lenovo/OneDrive/Desktop/os/apps/web/src/realtime/WSConnectionProvider.tsx):
- Connects to native WebSocket server (`ws://localhost:3001/ws?tenantId=...`).
- Handles reconnection with exponential backoff (`reconnectDelayRef`).
- Heartbeat ping/pong interval every 30 seconds (`pingTimerRef`).
- Dispatches typed events: `tool.started`, `tool.completed`, `tool.blocked`, `graph.escalation.required`, `session.paused`, `session.resumed`, `session.stopped`.
- Properly cleans up listeners on unmount.

---

## 5. Architectural Deficiencies in V1 & Roadmap for V2

1. **Information Fragmentation**: Governance (approvals/escalations), Execution Graph, and Missions are located on separate pages. The operator must jump across 4 pages to understand one mission.
2. **Missing Cline Centrality**: Cline is rendered identically to generic background agents. The UI fails to show Cline as the **Primary Cognitive Brain** making strategic decisions vs Synapse as the **Operating System**.
3. **No Prediction vs Reality Comparator**: Simulation records exist in the backend, but the UI does not visually contrast Monte Carlo failure probabilities with actual runtime outcomes.
4. **No Multi-Agent Workforce Kanban**: Agent cards are static rows instead of a live Kanban reflecting current execution states.
5. **No Evidence Lineage Explorer**: Lacks an end-to-end trace from `Mission → Run → Agent → Tool Call → Observation → Evidence → SHA-256 Hash Chain`.
6. **No "Needs You" Action Center**: Critical approvals and escalations are buried inside tabs instead of an elevated, persistent notification tray.
7. **No "Show Me What the Agents Did" Summary**: Lacks an automated, evidence-backed accomplishment breakdown.

---

## 6. Actionable Blueprint for Operator UI V2

We will upgrade `apps/web` into a **Command Center** with:
- **Flagship Mission Cockpit V2** combining live interactive DAG, active agents, governance drawer, and real-time activity stream.
- **Cline Primary Brain Panel** highlighting cognitive decisions, reasons, and next actions.
- **Prediction vs Reality Analytics Visualizer**.
- **Workforce Kanban View** across execution stages.
- **Forensic Evidence Lineage Explorer** displaying SHA-256 Merkle chains.
- **Global "Needs You" Surface** prioritizing human approvals and escalations.
- **Global Command Palette** (`Cmd+K` / `>`) for instant operator intervention.
