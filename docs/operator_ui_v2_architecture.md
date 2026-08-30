# SYNAPSE-OS — OPERATOR UI V2 ARCHITECTURE & SPECIFICATION

**Product Milestone**: V2 Command Center  
**Core Thesis**: *The Operator UI is the product. The user must understand the state of an entire multi-agent organization in seconds.*

---

## 1. Information Architecture & Invariant Hierarchy

```
                    ┌─────────────────────────────────────────┐
                    │            HUMAN OPERATOR               │
                    │           (COMMAND CENTER)              │
                    └────────────────────┬────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │           MISSION COCKPIT V2            │
                    │       (Single Pane of Authority)        │
                    └────────────────────┬────────────────────┘
                                         │
     ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
     ▼                   ▼                               ▼                   ▼
┌───────────────┐ ┌───────────────┐             ┌─────────────────┐ ┌─────────────────┐
│     CLINE     │ │   WORKFORCE   │             │   GOVERNANCE    │ │ PREDICTION VS   │
│ PRIMARY BRAIN │ │  MCP AGENTS   │             │  & "NEEDS YOU"  │ │     REALITY     │
└───────┬───────┘ └───────┬───────┘             └────────┬────────┘ └────────┬────────┘
        │                 │                              │                   │
        └─────────────────┼──────────────────────────────┘                   │
                          ▼                                                  │
                 ┌─────────────────┐                                         │
                 │ EXECUTION GRAPH │                                         │
                 │   & FRONTIER    │                                         │
                 └────────┬────────┘                                         │
                          ▼                                                  │
                 ┌─────────────────┐                                         │
                 │  TOOL GATEWAY   │                                         │
                 │   (EXECUTION)   │                                         │
                 └────────┬────────┘                                         │
                          ▼                                                  │
                 ┌─────────────────┐                                         │
                 │   REAL WORLD    │◄────────────────────────────────────────┘
                 │ (OBSERVATIONS)  │
                 └────────┬────────┘
                          ▼
                 ┌─────────────────┐
                 │ FORENSIC AUDIT  │
                 │  & EVIDENCE     │
                 └─────────────────┘
```

---

## 2. Core Questions Answered in 5 Seconds

1. **WHAT IS HAPPENING?** $\rightarrow$ Mission objective, active status, DAG version, and live execution frontier.
2. **WHY IS IT HAPPENING?** $\rightarrow$ Cline Primary Brain card showing cognitive intent, decision reason, and next step.
3. **WHO IS DOING IT?** $\rightarrow$ Active workforce panel distinguishing Cline (Lead) from connected MCP subagents.
4. **IS SYNAPSE ALLOWING IT?** $\rightarrow$ ToolGateway 7-level precedence evaluation status and active risk level.
5. **WHAT DOES THE HUMAN NEED TO DO?** $\rightarrow$ Persistent "Needs You" drawer highlighting pending approvals and escalations.

---

## 3. Screen Specifications

### A. Mission Cockpit V2 (`features/missions/MissionDetailPage.tsx`)
- **Header HUD**:
  - Mission Objective, Status Pill (`ACTIVE`, `PAUSED`, `AWAITING_APPROVAL`, `COMPLETED`, `FAILED`).
  - Risk Level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), Elapsed Time, Token Usage, Estimated Cost.
  - Current DAG Version ($V_N$), Active Frontier Node count.
  - Real-time Controls: `Pause`, `Resume`, `Stop Mission`, `Kill-Switch`.
- **Primary Grid**:
  - **Left / Center**: Interactive Live Execution Graph with frontier highlight, clickable node inspector (parameters, duration, tool calls, evidence, hash).
  - **Right**:
    - **Cline Primary Brain Card**: Strategic intent, decision reason, simulation request reason.
    - **Active Agents Lineage**: Roles, models, tokens, and current action.
    - **Governance & "Needs You"**: Active tool approvals, escalations, risk ceiling.
    - **Prediction vs Reality Analytics**: Monte Carlo failure probability vs actual observed failure probability.
- **Bottom**:
  - **Live Unified Activity Stream**: Color-coded actor events (`CLINE`, `SYNAPSE`, `DATABASE`, `SIMULATION`, `OPERATOR`).
  - **Accomplishment Report**: Automated evidence-backed accomplishment checklist.

### B. Multi-Agent Workforce Kanban (`features/workforce/WorkforcePage.tsx`)
- Ten distinct lifecycle columns:
  1. `QUEUED`
  2. `PLANNING`
  3. `EXECUTING`
  4. `WAITING`
  5. `SIMULATING`
  6. `APPROVAL`
  7. `BLOCKED`
  8. `ESCALATED`
  9. `COMPLETED`
  10. `FAILED`
- Cards display Provider, Model, Mission, Task, Latency, Tokens, Cost, Risk, and Primary Brain indicator.

### C. Prediction vs Reality Analytics (`features/simulation/SimulationPage.tsx`)
- Dedicated comparator contrasting:
  - Simulated Failure Probability (Monte Carlo 50 iterations).
  - Actual Observed Failure Probability.
  - Calculated Prediction Accuracy ($100 - |P_{sim} - P_{act}| \times 100$).
  - Twin Isolation Hash & Parameter Sensitivity.

### D. Forensic Evidence Explorer (`features/audit/AuditPage.tsx`)
- End-to-end lineage visualization:
  `Mission → Run → Agent → Tool Call → Observation → Evidence Record → Audit Event → SHA-256 Merkle Chain`.
- One-click copy for `callId`, `evidenceId`, `auditHash`.

### E. Global "Needs You" Experience (`components/navigation/AttentionNotification.tsx`)
- Real-time badge in top bar alerting to:
  - `APPROVAL REQUIRED` (with tool arguments & risk level).
  - `ESCALATION PENDING` (Level 1–4).
  - `BLOCKED / FAILED MISSIONS`.

---

## 4. Visual Quality & Ergonomics

- **Dark Mode Cyber-Grid Theme**: Deep slate/zinc palette (`#020617`, `#0f172a`, `#1e293b`) with high contrast text.
- **Typographic Hierarchy**: Monospace fonts (`JetBrains Mono`, `Fira Code`) for IDs, hashes, versions, and code; clean sans-serif for labels and headers.
- **Zero Fabrication Guarantee**: True empty/loading/degraded states; zero synthetic data.
