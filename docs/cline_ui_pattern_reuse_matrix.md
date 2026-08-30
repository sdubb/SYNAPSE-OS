# SYNAPSE-OS — CLINE UI PATTERN REUSE MATRIX

**Milestone**: `f09a838`  
**Purpose**: Catalog and adapt proven interaction patterns from Cline's interface while strictly maintaining the core architectural separation:
`CLINE = BRAIN`, `SYNAPSE = OPERATING SYSTEM`, `OPERATOR = HUMAN COMMANDER`.

---

## 1. Interaction Pattern Adaptation Matrix

| # | Cline Pattern | Why Useful | SYNAPSE Adaptation | Data Source | Implementation in Synapse UI V2 |
|---|---|---|---|---|---|
| **1** | **Task Header & Mode Selector** (`task-header/`) | High-density status banner showing active mode, model, cost, tokens, and quick pause/resume controls. | **Mission Cockpit Top Banner**: Displays Mission ID, Risk Level, Elapsed Time, Cost, Active Graph Version, and Primary Brain indicator. | `SynapseSession.tokenUsage`, `SynapseSession.status`, `ExecutionGraph.version` | Embedded in `MissionCockpit.tsx` header with real-time status pill and action buttons. |
| **2** | **Thinking Block Accordion** (`ThinkingRow.tsx`) | Collapsible, distinct visual container for reasoning steps before tool invocation. | **Cognitive Decision Card (Cline Primary Brain)**: Renders Cline's strategic intent, reason for action, and next steps, clearly distinguished from OS governance decisions. | `SynapseSession.messages` (reasoning/plan parts) + `tool.authorized` events | `ClineBrainCard.tsx` with distinctive purple/indigo cognitive styling. |
| **3** | **Tool Execution Row & Diff View** (`DiffEditRow.tsx`, `CommandOutputRow.tsx`) | Clear separation of tool name, parameters, execution status, and expandable terminal/file diff. | **Governed Tool Evidence Block**: Shows tool parameters, Precedence Level evaluation, SHA-256 argument hash, and execution evidence ID. | `ToolExecutionResult`, `AuditRecord.details`, `EvidenceRecord` | `EvidenceBlock.tsx` and `NodeInspector.tsx` with copyable hashes. |
| **4** | **Subagent Status Row** (`SubagentStatusRow.tsx`) | Compact indicator showing when a subagent is spawned, its active role, and token consumption. | **Workforce Agent Lineage Card**: Visualizes spawned agents, parent-child delegation, assigned DAG node, and real-time state. | `WorkforceGraphEngine.getWorkforce()`, `AgentDefinition` | `WorkforceKanban.tsx` and `ActiveAgentsPanel.tsx`. |
| **5** | **Auto-Approval / Policy Toggle** (`auto-approve-menu/`) | Explicit UI for managing permissions and tool approval boundaries. | **Governance Approval Tray & Policy Matrix**: Displays pending approval requests, risk score, blast radius, and one-click Approve/Reject with rationale. | `ToolApprovalRequest`, `SynapsePolicy` | `ApprovalsTray.tsx` and `GovernancePanel.tsx`. |
| **6** | **History & Session Drawer** (`HistoryView.tsx`) | Filterable list of previous tasks with cost, tokens, and timestamp summaries. | **Mission Timeline & Accomplishment Report**: Real-time chronological activity stream with actor badges and evidence links. | `useSessionTimeline()`, `AuditEngine.query()` | `MissionTimeline.tsx` and `AccomplishmentReport.tsx`. |
| **7** | **Worktrees / Branch Switcher** (`WorktreesView.tsx`) | Visual switcher for branching workspaces and isolated scratch environments. | **Prediction vs Reality & Twin Branch Selector**: Visualizes simulation branches, Monte Carlo sweeps, and branch risk deltas. | `SimulationRun`, `DigitalTwin.clone()` telemetry | `PredictionRealityComparator.tsx`. |
| **8** | **Slash Command Palette** (`SlashCommandMenu.tsx`) | Fast keyboard-driven interface (`Cmd+K` / `>`) for triggering commands without touching the mouse. | **Global Operator Command Palette**: Operator shortcuts to pause missions, approve requests, trigger kill switches, and inspect nodes. | Native browser event listener (`keydown`) + React state | `GlobalCommandPalette.tsx`. |

---

## 2. Distinct Visual Semantics: Cognition vs Governance

To prevent confusion between **Cognitive Reasoning** (Cline) and **Operational Governance** (Synapse), the UI enforces distinct color and icon semantics:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VISUAL SEMANTIC TAXONOMY                          │
├───────────────────────┬──────────────────────┬──────────────────────────────┤
│ ACTOR TYPE            │ COLOR THEME          │ ICON                         │
├───────────────────────┼──────────────────────┼──────────────────────────────┤
│ CLINE (PRIMARY BRAIN) │ Purple / Indigo      │ Brain / Sparkles             │
│ SYNAPSE (OS / POLICY) │ Cyan / Emerald       │ Shield / Lock / Server       │
│ REAL SYSTEM (OBSERVE) │ Emerald / Blue       │ Eye / Activity               │
│ SIMULATION (PREDICT)  │ Amber / Orange       │ GitBranch / FlaskConical     │
│ HUMAN OPERATOR        │ Rose / White         │ UserCheck / AlertOctagon     │
└───────────────────────┴──────────────────────┴──────────────────────────────┘
```

---

## 3. Implementation Plan

1. **Mission Cockpit V2**: Unify Mission overview, live execution graph, Cline primary brain status, active workforce, and governance into a single flagship cockpit view.
2. **Workforce Kanban**: Transform the flat agent list into a multi-column Kanban board organized by execution phase.
3. **Prediction vs Reality**: Create an analytical comparator visualizing Monte Carlo predictions against actual observed outcomes.
4. **Forensic Evidence Lineage**: Provide an inspectable SHA-256 Merkle chain drilldown from DAG node to audit record.
5. **Persistent "Needs You" Tray**: Elevate pending human interventions directly into the global shell.
