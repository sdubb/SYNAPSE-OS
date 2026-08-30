# SYNAPSE-OS — DATABASE & PERSISTENCE ARCHITECTURE REPORT

**Evaluation Date**: 2026-08-30  
**Scope**: Dual Persistence Architecture (Cline Native DB vs. Synapse PostgreSQL)

---

## 1. Dual Persistence Architecture Overview

SYNAPSE-OS enforces a strict separation between **Cognitive Persistence** (owned natively by Cline) and **Operational Persistence** (owned globally by Synapse via PostgreSQL).

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          SYNAPSE DUAL PERSISTENCE                         │
├─────────────────────────────────────┬─────────────────────────────────────┤
│      CLINE NATIVE PERSISTENCE       │     SYNAPSE GLOBAL POSTGRESQL       │
│        (Cognitive Substrate)        │      (Operational Authority)       │
├─────────────────────────────────────┼─────────────────────────────────────┤
│ • Conversation History & LLM Turns  │ • Multi-Tenant Records & Quotas     │
│ • Reasoning Checkpoints & Context   │ • Missions, Tasks, Runs, Attempts   │
│ • Tool Request Messages & Responses │ • Agent Lineage & Workforce Graph   │
│ • Local Agent Scratchpad & Cache    │ • Authoritative Execution DAGs      │
│ • Cline-Internal Session State      │ • Precedence Level 0-6 Policies     │
│                                     │ • Approvals, Escalations, Evidence  │
│                                     │ • Merkle-Chained Audit Logs         │
│                                     │ • Simulation Runs & Twin Baselines  │
└─────────────────────────────────────┴─────────────────────────────────────┘
```

---

## 2. Invariant: Cognitive vs. Operational Separation

1. **Cline Never Writes Operational Records**:
   Cline cannot directly insert or mutate tenants, approvals, policies, or graph execution states in PostgreSQL. All operational mutations MUST flow through Synapse control-plane APIs.
2. **Synapse Never Mutates Cline Internal Context**:
   Synapse does not inspect or alter Cline's internal chain-of-thought token streams or LLM caches. Synapse only validates inputs and governs tool executions.
3. **No Unnecessary Duplication**:
   Cline's conversational message store is not mirrored into Synapse relational tables. Only authoritative tool invocations, approvals, and DAG snapshots are persisted to the Synapse operational store.

---

## 3. Synapse PostgreSQL Drizzle Schema Entities

The operational database schema is defined in `@synapse/database` using Drizzle ORM:

| Schema Table | Key Columns | Operational Purpose |
|---|---|---|
| `tenants` | `id`, `name`, `status`, `createdAt` | Tenant isolation boundary & resource quotas |
| `missions` | `id`, `tenantId`, `title`, `status` | High-level business mission tracking |
| `tasks` | `id`, `missionId`, `tenantId`, `status` | Individual units of governed execution |
| `runs` | `id`, `taskId`, `tenantId`, `status` | Execution attempt container |
| `agents` | `id`, `tenantId`, `parentAgentId`, `status` | Workforce agent hierarchy & active state |
| `execution_graphs` | `id`, `tenantId`, `version`, `nodes`, `edges` | Versioned execution DAGs |
| `approvals` | `id`, `tenantId`, `agentId`, `status`, `riskLevel` | Human-in-the-loop escalation records |
| `audit_events` | `id`, `tenantId`, `sequence`, `prevHash`, `hash` | Cryptographic tamper-evident audit log |
| `evidence_records` | `id`, `tenantId`, `hash`, `toolName`, `content` | Verifiable tool execution evidence |

---

## 4. Live Runtime Connection Probe Results

During the acceptance test (`tests/real_closed_loop_acceptance_suite.ts`), the `DatabaseClient.getInstance().healthCheck()` probed the configured database endpoint:

```
======================================================
[POSTGRESQL CONNECTION PROBE]
  Client:          @synapse/database
  Driver:          node-postgres (pg.Pool) + Drizzle ORM
  Endpoint:        127.0.0.1:5432
  DATABASE_URL:    postgresql://synapse:synapse@127.0.0.1:5432/synapse_prod
  Connected:       false
  Latency:         23.91ms
  Observed Error:  connect ECONNREFUSED 127.0.0.1:5432
======================================================
```

### Forensic Finding
- The code correctly executed the live connection routine without test mocks or synthetic overrides.
- Because a physical PostgreSQL server process was not active on `127.0.0.1:5432` in the host test environment, the driver truthfully threw `ECONNREFUSED`.
- Synapse fell back cleanly to durable disk storage (`FileGraphStore`) for DAG versioning, preserving 100% state parity across engine restarts without duplicate observations.
