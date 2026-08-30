# SYNAPSE-OS — SYSTEM ARCHITECTURE SPECIFICATION

## 1. Architectural Philosophy & The Core Invariant

SYNAPSE-OS is the authoritative enterprise operating system for governed AI agent execution. It bridges open-ended AI intelligence (represented by **Cline**) with deterministic, zero-trust enterprise controls, simulation modeling, Merkle evidence sealing, and multi-tenant security boundaries.

```
┌─────────────────────────────────────────────────────────┐
│                      CLINE (BRAIN)                      │
│        Thinks • Plans • Reasons • Evaluates Reality     │
└────────────────────────────┬────────────────────────────┘
                             │ Tools & Plan Proposals
                             ▼
┌─────────────────────────────────────────────────────────┐
│                   SYNAPSE OS (CONTROL)                  │
│       Governs • Authorizes • Simulates • Enforces       │
│                                                         │
│  ┌────────────────────┐      ┌───────────────────────┐  │
│  │ Execution Graph    │      │ Simulation Engine     │  │
│  │ State & Frontier   │      │ Digital Twin Clones   │  │
│  └─────────┬──────────┘      └───────────┬───────────┘  │
│            │                             │              │
│            ▼                             ▼              │
│  ┌────────────────────┐      ┌───────────────────────┐  │
│  │ Tool Gateway       │      │ Workforce Graph       │  │
│  │ Policy / Safety    │      │ Agent Registry        │  │
│  └─────────┬──────────┘      └───────────┬───────────┘  │
└────────────┼─────────────────────────────┼──────────────┘
             │ Cryptographic Tokens        │
             ▼                             ▼
┌─────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE & RUNTIMES               │
│        Docker Containers • VMs • Production Systems     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Final Responsibility Matrix

The division of responsibilities between **Cline** and **Synapse** is strict and non-negotiable:

| Dimension | CLINE (The Brain) | SYNAPSE (The Operating System) |
|---|---|---|
| **Reasoning & Cognition** | Authoritative: Understands user intent, analyzes code, diagnoses issues. | Passive: Does NOT make autonomous AI planning decisions. |
| **Execution Graph Planning** | Generates the structured DAG plan via `submit_execution_plan`. | Validates topological integrity, calculates the active frontier, and persists versions. |
| **Branch Selection** | Evaluates observations and chooses next branch of thought. | Enforces legal edge traversal and evaluates sandboxed boolean conditions. |
| **Simulation** | Interprets simulation results and decides whether to continue or pivot. | Executes discrete-event simulations / Monte Carlo sweeps on isolated Digital Twin clones. |
| **Replanning** | Reasons over failures and calls `propose_replan` with new DAG nodes. | Enforces Optimistic Concurrency Control (`baseVersion`) and creates immutable Graph V+1. |
| **Workforce & Delegation** | Requests sub-agent spawning via `team_spawn_teammate`. | Authoritatively tracks workforce hierarchy, assigns runtimes, and reconciles crashes. |
| **Tool Execution** | Requests tool execution via standard parameters. | Authoritative execution boundary: enforces Kill Switch, Policy, Safety, Capabilities, and Approvals. |
| **Evidence & Auditing** | None. | Cryptographically seals Merkle evidence chains and immutable audit records. |
| **Escalation & Safety** | Requests escalation when human assistance is needed. | Enforces `BLOCKED` status on LEVEL_3/4 escalations and freezes dependent frontiers. |
| **Verification** | Validates task outcomes against acceptance criteria. | Provides authoritative runtime verification checks and monitors system invariants. |

---

## 3. Subsystem Architecture

### 3.1 Tool Gateway (`@synapse/tool-gateway`)
The **Tool Gateway** is the sole authoritative execution boundary in Synapse OS. No tool can run on host infrastructure without passing through its multi-level precedence pipeline:
1. **Precedence Level 0 (Multi-Tenant Isolation):** Verifies active `tenantId` and prevents cross-tenant workspace access.
2. **Precedence Level 1 (Kill Switch):** Checks Level 1 (Stream Abort), Level 2 (Session Stop), and Level 3 (Workspace Lock).
3. **Precedence Level 2 (Safety Engine):** Performs heuristic risk scoring, secret leakage detection, and prompt injection analysis.
4. **Precedence Level 3 (Workspace Boundaries):** Enforces path containment to prevent directory traversal escapes.
5. **Precedence Level 4 (Policy Engine):** Evaluates tenant security rules and destructive command blacklists.
6. **Precedence Level 5 (Capability Authorizer):** Validates the agent's explicit permissions in the Capability Registry.
7. **Precedence Level 6 (Approval Engine):** Halts execution and awaits human operator sign-off if required.
8. **Precedence Level 7 (Issuance):** Generates an HMAC-SHA256 `AuthorizationToken` cryptographically bound to the call parameters.

### 3.2 Dynamic Execution Graph Engine (`@synapse/control-plane`)
- **Immutability:** Every plan revision produces a new immutable version ($V_1 \rightarrow V_2 \rightarrow V_N$). Historical snapshots cannot be mutated.
- **Frontier Control:** `getFrontier()` restricts execution exclusively to valid entry or ready nodes (`QUEUED`, `WAITING`, `RUNNING`, `PAUSED`). Arbitrary out-of-order execution attempts are rejected.
- **Observation Engine:** Converts tool results into trusted `OBSERVED_FACT`s with signed provenance (`callId`, `evidenceId`, `auditEventId`), preventing AI hallucination from manufacturing reality.
- **Sandboxed DSL:** `ConditionEvaluator` executes nested boolean logic (`AND`, `OR`, `NOT`, parentheses) via a custom recursive-descent parser without `eval()` or `new Function()`.

### 3.3 Simulation Engine & Digital Twin (`@synapse/simulation-engine`, `@synapse/twin-engine`, `@synapse/world-engine`)
- **Twin Isolation:** Simulations operate strictly on isolated clones of the production `DigitalTwin`. Production state is guaranteed to remain byte-for-byte unaffected.
- **Monte Carlo Sweeps:** Stochastic simulations calculate empirical failure rates, blast radii, and constraint violation counts across dependent topologies.

### 3.4 Workforce Graph Engine (`@synapse/control-plane`)
- **Authoritative Registry:** Synchronizes with Cline's teammate spawning tools (`team_spawn_teammate`, `team_terminate_teammate`).
- **Idempotency & Reconciliation:** Idempotent registration prevents duplicate agents, while `reconcile()` purges ghost/orphan agents following runtime crashes.

---

## 4. Security & Governance Invariants

1. **Zero-Trust Multi-Tenancy:** All state, tools, runtimes, twins, and evidence are partitioned strictly by `tenantId`.
2. **Fail-Closed Evidence Capture:** High and Critical risk operations immediately abort and discard execution output if cryptographic evidence persistence fails.
3. **Optimistic Concurrency Control:** Graph replanning requires matching `baseVersion` to prevent lost updates or conflicting AI branches.
4. **Human Super-Authority:** Any `LEVEL_3` or `LEVEL_4` escalation halts the active execution frontier until explicit operator resolution.
