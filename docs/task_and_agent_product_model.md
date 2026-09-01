# SYNAPSE-OS — TASK & AGENT PRODUCT MODEL

**Document**: `docs/task_and_agent_product_model.md`  
**Date**: 2026-09-01  
**Architecture Classification**: Canonical Synapse OS Hierarchy  

---

## 1. The Core Entities Explained in Plain English

To eliminate confusion for new operators, Synapse defines 4 core hierarchy levels:

```text
┌────────────────────────────────────────────────────────┐
│                        MISSION                         │
│  (The High-Level Human Goal, e.g. "Refactor Auth")     │
└───────────────────────────┬────────────────────────────┘
                            │ decomposes into
                            ▼
┌────────────────────────────────────────────────────────┐
│                    DAG TASK NODES                      │
│  (Sequenced Milestones, Dependencies, Frontier State)   │
└───────────────────────────┬────────────────────────────┘
                            │ dispatched to
                            ▼
┌────────────────────────────────────────────────────────┐
│             CLINE (PRIMARY COGNITIVE BRAIN)            │
│  (Autonomous Reasoning, Planning, Tool Dispatch)       │
└───────────────────────────┬────────────────────────────┘
                            │ delegates to (when needed)
                            ▼
┌────────────────────────────────────────────────────────┐
│               SUBORDINATE WORKER SUBAGENTS             │
│  (Specialized Workers: Code Fixer, Auditor, Verifier)  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Concept Definitions

| Concept | Plain English Meaning | Authoritative Role | Example |
|---|---|---|---|
| **Mission** | The overarching project or problem the human wants solved. | Top-level session tracked in database with cost, status, and duration. | *"Audit and patch SQL injection vulnerabilities"* |
| **Task / DAG Node** | A single structured milestone with inputs, outputs, prerequisites, and risk level. | Managed by `ExecutionGraphEngine` with versioned OCC history. | `node_1_inspect_queries` (Read-only analysis) |
| **Cline (Primary Brain)** | The central intelligence embedded in Synapse. | Formulates DAG plans, reasons about errors, replans, and commands tool executions. | `cline_lead_brain` (Claude 3.5 Sonnet) |
| **Worker Subagent** | A subordinate worker agent spawned for specialized parallel tasks. | Executes within strict capability scopes under Cline's coordination. | `subagent_test_runner`, `subagent_security_scanner` |
| **Frontier** | The current active frontier of tasks whose prerequisites are 100% completed. | Nodes currently executing or ready to execute next. | Nodes with in-degree 0 in the remaining DAG |

---

## 3. Human Task Manipulation Controls

Operators have full authority to modify tasks at any lifecycle stage:

1. **Direct NLP Creation**: Tell Cline *"Add a performance benchmark step before closing the mission"*.
2. **Interactive Skip / Prune**: Click any node in the Cockpit $\rightarrow$ *Skip This Task*.
3. **Interactive Retry**: Click any failed node $\rightarrow$ *Retry Task*.
4. **Pause / Freeze**: Pause the mission to prevent frontier progression.
5. **OCC Versioning**: Every modification creates an immutable snapshot (`V1`, `V2`, `V3`), preserving full audit history.
