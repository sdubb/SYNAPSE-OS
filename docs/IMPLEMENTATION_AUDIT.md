# Synapse OS — Backend Implementation & Architecture Audit

**Document Version:** 1.0.0  
**Date:** August 25, 2026  
**Status:** Canonical Architectural & Implementation Baseline  
**Author:** Principal Engineer, Synapse OS  

---

## 1. Executive Summary & Core Principle

Synapse OS is a governed, enterprise-grade agent operating system designed to run atop a native fork of the open-source **Cline** agent engine.

```
                                  SYNAPSE OS
                                      │
                     ┌────────────────┴────────────────┐
                     │                                 │
              CONTROL PLANE                      WORLD ENGINE
                     │                           (Digital Twin
                     │                            & Simulation)
                     ▼                                 │
           SYNAPSE ADAPTER LAYER                       │
                     │                                 │
                     ▼                                 │
            FORKED CLINE ENGINE ◄──────────────────────┘
            (@cline/core, @cline/agents,
             @cline/llms, @cline/shared)
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
      Agents       Teams       Tools / MCP
         │           │           │
         └───────────┼───────────┘
                     │
              GOVERNANCE LAYER
       (Policy, Approvals, Safety,
        Verification, Audit, RBAC)
                     │
                     ▼
             REAL EXECUTION &
             ISOLATED WORKSPACES
```

### Critical Axioms
1. **Single Agent Engine:** Cline is the **only** production agent execution engine. There is no second reasoning engine, and no integration with Codex, Claude Code, Aider, Goose, or other agent frameworks.
2. **No Fake Primitives:** No mock agent loops, no synthetic session databases mimicking Cline, no stub tool executors, and no fake kill switches that merely toggle database booleans.
3. **Strict Separation of Concerns:**
   - **Cline Owns:** LLM reasoning loop, prompt engineering, built-in tool execution (bash, file edit, search, browser), sub-agent teams runtime, MCP client/transports, session message streams, and token usage accounting.
   - **Synapse Owns:** Multi-tenant identity, RBAC/ABAC authorization, proactive policy evaluation, human-in-the-loop approvals, independent multi-vector verification, cryptographic evidence chains, tamper-evident audit logs, multi-tenant scheduling, enterprise secrets management, workspace isolation, external agent supervision, and the World Engine / Digital Twin simulation subsystem.
4. **Self-Contained Product:** The system bundles its own forked Cline engine; end users and enterprise deployments require zero external or global Cline CLI installations.

---

## 2. Current Repository Environment & Toolchain Audit

### 2.1 Workspace Inventory
- **Root Directory:** `C:\Users\lenovo\OneDrive\Desktop\os`
- **Present Reference Artifacts:**
  - `SYNAPSE OS.docx` (High-level architecture specification)
  - `Synapse O1.docx` (Detailed file manifest and module specifications)
  - `synapse_os_spec.txt` (Extracted full-text specification & architectural source of truth)
- **Git Status:** Clean workspace; initial repository initialization pending.

### 2.2 System & Toolchain Status
| Runtime / Tool | Version | Status | Operational Notes |
|---|---|---|---|
| **Node.js** | v22.20.0 | Available (Active) | Meets requirement `Node >= 22.0.0` |
| **npm** | 10.9.3 | Available (Active) | Package management and workspace scripts |
| **Git** | 2.53.0.windows.1 | Available (Active) | Repository version control, worktree isolation |
| **Python** | 3.13 | Available | System scripting and tooling verification |
| **TypeScript** | Target: 5.4+ / ES2022 | Configured for Monorepo | Strict type checking, NodeNext module resolution |

---

## 3. Cline Architecture & Fork Boundaries

### 3.1 Upstream Cline Monorepo Topology
Cline's native architecture is structured as a TypeScript/Node monorepo:
- `sdk/packages/shared`: Universal domain types, schemas (Zod), protocol contracts, utilities.
- `sdk/packages/llms`: Provider abstraction (Anthropic, OpenAI, Bedrock, Vertex, Ollama, OpenRouter, DeepSeek), model configurations, token counting.
- `sdk/packages/agents`: Core agent execution loop, system prompt orchestration, tool invocation protocols.
- `sdk/packages/core`: `ClineCore`, session storage, team runtime (`AgentTeamsRuntime`, `bootstrapAgentTeams`), MCP manager (`InMemoryMcpManager`, `McpServerClient`), automation engine (`ClineCoreAutomationApi`), cron/scheduling subsystems, hooks, extension bridges.
- `apps/cli`: CLI commands (`dev`, `doctor`, `history`, `hook`, `plugin`, `schedule`, `hub`, `kanban`, `mcp`).
- `apps/cline-hub`: Remote runtime server and host connectors (`HubRuntimeHost`, `LocalRuntimeHost`).

### 3.2 Synapse Fork Boundary
Upstream Cline code is maintained under `engine/cline/` (or `cline/` as an internal workspace package). Synapse interacts with Cline **exclusively** through `packages/engine-adapter/` (`ClineEngine`).

```
                    Synapse Application Services
                                │
                                ▼
                   packages/engine-adapter
                       (ClineEngine.ts)
                                │
                                ▼
                    engine/cline/sdk/packages/core
                          (ClineCore.ts)
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
 @cline/agents             @cline/llms           @cline/shared
```

---

## 4. Synapse Monorepo Package Topology

```
synapse/
├── apps/
│   ├── backend/               # Main Express/Fastify REST API server
│   ├── realtime/              # Unified WebSocket server for real-time events & approvals
│   └── worker/                # Background queue worker (verification, simulations, schedules)
│
├── packages/
│   ├── contracts/             # Zod schemas, TypeScript DTOs, API & Event definitions
│   ├── database/              # PostgreSQL client, Drizzle/Prisma schema, migrations, repositories
│   ├── tenancy/               # TenantContext, tenant isolation guards, resource quotas
│   ├── security/              # Auth, JWT, RBAC, sandbox constraints, secret encryption
│   ├── secrets/               # SecretManager, AES-256-GCM encryption, secret redactor
│   ├── policy-engine/         # Proactive policy rules, policy compiler, AST evaluator
│   ├── approval-engine/       # Human-in-the-loop state machine, timeout manager, DB store
│   ├── safety-engine/         # Risk classifier, blast radius analyzer, emergency kill switch
│   ├── event-bus/             # In-memory / Redis event bus, typed envelope publisher/subscriber
│   ├── engine-adapter/        # Exclusive integration boundary to forked Cline engine
│   ├── control-plane/         # Agent/Task/Session/Team controllers, state machines
│   ├── agent-registry/        # Agent catalog, capability registration, ownership mappings
│   ├── runtime-manager/       # Workspace isolation, resource allocator, process supervisor
│   ├── verification-engine/   # Multi-vector assertions (Test, Git, Build, Security, Verifier Agent)
│   ├── evidence/              # Cryptographic evidence store, SHA-256 chains, artifact store
│   ├── audit-engine/          # Tamper-evident, immutable audit event logger with redaction
│   ├── scheduler/             # Governed multi-tenant cron & automation executor
│   ├── connector-manager/     # Integrations (Slack, Discord, Linear, GitHub, Webhooks)
│   ├── external-agents/       # Supervisory adapter for external third-party agent runtimes
│   ├── world-engine/          # Digital Twin, data ingestion, entity-relationship state graph
│   ├── simulation-engine/     # Scenario branching, discrete-event clock, Monte Carlo engine
│   ├── twin-engine/           # Twin synchronization, drift detection, confidence scoring
│   └── observability/         # OpenTelemetry tracing, Prometheus metrics, structured logs
│
├── engine/
│   └── cline/                 # Forked upstream Cline SDK & core
├── migrations/                # SQL / Drizzle schema migrations
├── tests/                     # Unit, Integration, E2E, Security, Chaos test suites
└── docs/                      # Canonical architecture, API, and operational documentation
```

---

## 5. Subsystem Lifecycles & Execution Workflows

### 5.1 Agent & Task Execution Lifecycle
```
[User / Schedule / API]
         │
         ▼
 1. Tenant Authentication & RBAC Check (tenancy, security)
         │
         ▼
 2. Task Created in DB [State: PLANNED / QUEUED]
         │
         ▼
 3. Proactive Policy & Risk Evaluation (policy-engine, safety-engine)
         │
         ▼
 4. Workspace Provisioning & Isolation (runtime-manager, workspaces)
         │
         ▼
 5. Cline Session Instantiation (engine-adapter -> ClineCore)
         │
         ▼
 6. Execution Loop [State: RUNNING]
         │
         ├── Agent proposes Tool Call
         │         │
         │         ▼
         │   Policy & Risk Engine Check
         │         ├── ALLOW -> Execute Tool via Cline
         │         ├── DENY  -> Return Policy Violation to Agent
         │         └── REQUIRE_APPROVAL ->
         │                 │
         │                 ▼
         │         ApprovalEngine creates Pending Approval Request
         │                 │
         │                 ▼
         │         WebSocket Broadcasts to Approver UI
         │                 │
         │                 ▼
         │         Human Decision (Approve / Reject / Timeout)
         │                 │
         │                 ▼
         │         Cline Continues or Aborts Tool Execution
         │
         ▼
 7. Agent Claims Completion ("done")
         │
         ▼
 8. Execution Frozen & Evidence Collected [State: VERIFYING]
         │
         ▼
 9. VerificationEngine Executes Multi-Vector Plan
         │  - File system assertions
         │  - Git diff analysis
         │  - Test & Build runs
         │  - Security & AST checks
         │  - Verifier Agent (Constrained Cline Session)
         │
         ▼
10. Verdict Reached: PASS / FAIL / INCONCLUSIVE
         │
         ├── PASS -> [State: COMPLETED] -> Update Digital Twin
         └── FAIL -> [State: FAILED / RECOVERY] -> Trigger Retry or Escalate
         │
         ▼
11. Cryptographic Evidence Chain Written & Audit Event Finalized
```

### 5.2 Event Pipeline Architecture
```
Cline Engine Native Events
(content_start, content_update, tool_start, tool_end, usage, notice, done, error)
                        │
                        ▼
           ClineEventAdapter (engine-adapter)
                        │
                        ▼
           Synapse Normalized Event Envelope
    {
      eventId: "evt_uuid",
      eventType: "agent.tool.executed",
      tenantId: "ten_uuid",
      agentId: "agt_uuid",
      sessionId: "ses_uuid",
      taskId: "tsk_uuid",
      workspaceId: "wks_uuid",
      runtimeId: "rt_uuid",
      timestamp: "2026-08-25T...",
      sequence: 142,
      payload: { ... },
      traceId: "trace_uuid"
    }
                        │
                        ▼
                    EventBus
                        │
      ┌─────────────────┼─────────────────┬─────────────────┐
      ▼                 ▼                 ▼                 ▼
 AuditEngine      Observability      Realtime (WS)    World Engine
(Immutable Log)  (Metrics/Traces)   (Client Stream)   (Twin Update)
```

---

## 6. Database Delineation & Source-of-Truth Matrix

| Data Domain | Owner Subsystem | Storage Mechanism | Authority & Content |
|---|---|---|---|
| **Tenants & Users** | Synapse `tenancy` & `security` | PostgreSQL (`tenants`, `users`, `memberships`) | Synapse is 100% authoritative. |
| **Agent Catalog** | Synapse `agent-registry` | PostgreSQL (`agents`, `agent_capabilities`) | Defines agent roles, system prompt overrides, tool policies. |
| **Tasks & Workspaces** | Synapse `control-plane` | PostgreSQL (`tasks`, `workspaces`) | Task hierarchy, dependencies, workspace paths, git worktrees. |
| **Session Mappings** | Synapse `control-plane` | PostgreSQL (`sessions`, `session_mappings`) | Maps `synapse_session_id` to `cline_session_id`, tenant, task. |
| **Session Message History** | Cline Engine | Cline Internal Storage / Disk | Cline is 100% authoritative; Synapse does NOT clone message DB. |
| **Policies & Rules** | Synapse `policy-engine` | PostgreSQL (`policies`, `policy_rules`) | Rule definitions, path restrictions, tool whitelists/blacklists. |
| **Approvals** | Synapse `approval-engine` | PostgreSQL (`approvals`, `approval_decisions`) | Approval requests, status, approver identity, reasoning, expiry. |
| **Verification & Evidence** | Synapse `verification-engine` & `evidence` | PostgreSQL (`verification_plans`, `evidence_chains`, `artifacts`) | Assertions, execution proofs, hashes, verifier verdicts. |
| **Audit Trail** | Synapse `audit-engine` | PostgreSQL (`audit_logs` - append only) | Tamper-evident, cryptographically hashed security events. |
| **Schedules & Automation** | Synapse `scheduler` | PostgreSQL (`schedules`, `schedule_runs`) | Governed cron schedules invoking Cline automation. |
| **World Engine & Twins** | Synapse `world-engine` | PostgreSQL (`worlds`, `entities`, `relationships`, `states`) | Entity-relationship graph, snapshot states, digital twins. |
| **Simulations** | Synapse `simulation-engine` | PostgreSQL (`simulations`, `scenarios`, `simulation_runs`) | Scenario parameter overrides, clock ticks, comparative outcomes. |

---

## 7. Security, Governance & Kill Switch Matrix

```
                               EMERGENCY KILL SWITCH
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
Level 1: Message Abort           Level 2: Session Stop            Level 3: Runtime Termination
Cline interrupt signal sent;     Cline session gracefully halted; Child process / worker killed;
active LLM stream severed.       task marked STOPPED in DB.       workspace locked; tokens revoked.
```

- **Zero-Trust Isolation:** Every database query and service request is scoped by `tenant_id`. No cross-tenant access is permissible.
- **Secret Redaction:** `SecretRedactor` scans all logs, approval payloads, tool arguments, and event streams, replacing sensitive API tokens, private keys, and passwords with `[REDACTED]`.
- **Command & Path Guardrails:** Strict path traversal checks prevent access outside the allocated workspace boundary (`/workspace/{tenant_id}/{task_id}`).

---

## 8. World Engine & Digital Twin Architecture

```
 External Sources
(APIs, DBs, Logs, Files, Telemetry)
         │
         ▼
 1. Ingestion & Normalization (CSVImporter, JSONImporter, LogImporter, StreamImporter)
         │
         ▼
 2. Entity & Relationship Graph Construction (WorldModel, Entity, Relationship)
         │
         ▼
 3. Digital Twin Instantiation (DigitalTwin, TwinBuilder, TwinSynchronizer)
         │
         ├── Continuous Live State Synchronization & Drift Detection
         │
         ▼
 4. Scenario Branching (ScenarioBuilder)
         │   [Baseline Twin] ───► [Scenario A: Parameter Δ] ───► [Scenario B: Parameter Δ]
         │
         ▼
 5. Discrete-Event Simulation Clock & State Transitions (SimulationEngine, RuleEngine)
         │
         ▼
 6. Comparative Outcome Analysis (ComparisonEngine, ResultAnalyzer)
         │
         ▼
 7. Blast-Radius Verification for Agent Proposed Actions
```

---

## 9. Contradictions, Discrepancies & Resolutions

1. **Document vs. Monorepo Structure (`apps/api` vs `apps/backend`):**
   - *Resolution:* Adopt `apps/backend/` as the primary API application and `apps/realtime/` as the dedicated WebSocket server, aligning with the granular production layout in Synapse O1.
2. **Cline CLI Integration (Subprocess vs Bundled Code):**
   - *Resolution:* Do NOT shell out to an external CLI. Import and invoke Cline's core SDK directly in-process via `engine-adapter`.
3. **External Agent Support vs. Single Native Engine:**
   - *Resolution:* Cline is the *only* execution engine. External agents (e.g. 3rd-party webhook-driven bots) are strictly supervised via `external-agents` supervisory adapters for observation, policy check, and verification.

---

## 10. Phased Implementation Roadmap

- **Phase 1: Repository Audit & Planning Baseline** (Current Step — Complete)
- **Phase 2: Monorepo Workspace & Build Foundation** (Turborepo/npm workspaces, TypeScript configs, ESLint)
- **Phase 3: Core Contracts & Data Model** (`packages/contracts`, Zod DTOs, Event schemas)
- **Phase 4: Database Layer & Tenancy** (`packages/database`, `packages/tenancy`, Drizzle/Postgres repositories)
- **Phase 5: Forked Cline Engine Adapter** (`packages/engine-adapter`, `ClineEngine`, `ClineEventAdapter`)
- **Phase 6: Event Bus & Realtime Communication** (`packages/event-bus`, `apps/realtime`, WebSocket server)
- **Phase 7: Policy & Approval Engines** (`packages/policy-engine`, `packages/approval-engine`)
- **Phase 8: Safety, Risk & Kill Switch** (`packages/safety-engine`, `packages/secrets`, `packages/security`)
- **Phase 9: Control Plane & Runtime Manager** (`packages/control-plane`, `packages/runtime-manager`, `packages/agent-registry`)
- **Phase 10: Verification & Evidence Engine** (`packages/verification-engine`, `packages/evidence`)
- **Phase 11: Audit Trail & Observability** (`packages/audit-engine`, `packages/observability`)
- **Phase 12: Governed Scheduler & Connectors** (`packages/scheduler`, `packages/connector-manager`)
- **Phase 13: External Agent Supervision** (`packages/external-agents`)
- **Phase 14: World Engine (Digital Twin)** (`packages/world-engine`, `packages/twin-engine`)
- **Phase 15: Simulation Engine** (`packages/simulation-engine`)
- **Phase 16: Synapse REST API Server** (`apps/backend`, controllers, middleware, routes)
- **Phase 17: Worker Application** (`apps/worker`, background job queues)
- **Phase 18: Comprehensive Test Suite & Final System Validation** (Unit, Integration, E2E, Security, Chaos)

---
*End of Implementation Audit.*
