# SYNAPSE-OS — FULL BACKEND ACCEPTANCE TEST SPECIFICATION

## 1. System & Environment Overview

This specification details the end-to-end backend acceptance, chaos, and live LLM integration test harness for **SYNAPSE-OS**.

```
┌──────────────────────────────────────────────────────────┐
│                   CLINE REASONING BRAIN                  │
│       OpenRouter LLM API • Autonomous Planning           │
└────────────────────────────┬─────────────────────────────┘
                             │ Plan Proposals & Tool Calls
                             ▼
┌──────────────────────────────────────────────────────────┐
│                    SYNAPSE CONTROL PLANE                 │
│                                                          │
│  ┌─────────────────────────┐   ┌──────────────────────┐  │
│  │ Execution Graph Engine  │   │ Workforce Engine     │  │
│  │ Immutable Version Store │   │ Lineage & Idempotency│  │
│  └────────────┬────────────┘   └──────────┬───────────┘  │
│               │                           │              │
│               ▼                           ▼              │
│  ┌─────────────────────────┐   ┌──────────────────────┐  │
│  │ Tool Gateway            │   │ Simulation Engine    │  │
│  │ 7-Layer Precedence Pipe │   │ Digital Twin Clones  │  │
│  └────────────┬────────────┘   └──────────┬───────────┘  │
└───────────────┼───────────────────────────┼──────────────┘
                │ Cryptographic Tokens      │
                ▼                           ▼
┌──────────────────────────────────────────────────────────┐
│                 BACKEND INFRASTRUCTURE                   │
│   Durable Job Queue • Relational DB • Event Bus Stream   │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Structure & Package Inventory

| Layer | Package / Subsystem | Primary Responsibilities |
|---|---|---|
| **AI Substrate** | `@synapse/engine-adapter` | Cline session lifecycle, LLM integration, tool governance interceptors, graph MCP tools. |
| **Control Plane** | `@synapse/control-plane` | Dynamic Execution Graph (`ExecutionGraphEngine`), DAG frontier calculator, `WorkforceGraphEngine`, `ConditionEvaluator`. |
| **Tool Execution** | `@synapse/tool-gateway` | Sole execution boundary, HMAC-SHA256 token issuance, arguments hash verification, `SafetyPolicyPipeline`. |
| **Simulation** | `@synapse/simulation-engine` | Discrete-event clock, Monte Carlo sweep engine, constraint validation, stochastic parameter sampling. |
| **Digital Twin** | `@synapse/twin-engine`, `@synapse/world-engine` | Multi-tier entity-relationship graph model, immutable state diffs, topology isolation. |
| **Security & Safety** | `@synapse/safety-engine`, `@synapse/security`, `@synapse/secrets` | Multi-level Kill Switch, risk classifier, path containment enforcer, streaming secret redactor. |
| **Governance** | `@synapse/policy-engine`, `@synapse/approval-engine`, `@synapse/agent-registry` | Multi-tenant security policies, human operator approval workflows, agent capability manifests. |
| **Evidence & Audit** | `@synapse/evidence`, `@synapse/audit-engine` | Cryptographic Merkle evidence chains, tamper-evident audit logs. |
| **Runtime & Messaging**| `@synapse/runtime-manager`, `@synapse/event-bus`, `apps/worker` | Runtime instance leases, normalized event envelope stream, durable job queues with lease locking. |
| **Persistence** | `@synapse/database`, `FileGraphStore` | Relational tables (tenants, tasks, sessions, approvals, audits), durable JSON graph version store. |

---

## 3. Required Environment Configuration

```bash
# OpenRouter Configuration (Credentials must remain in environment only)
export OPENROUTER_API_KEY="<set-via-secure-environment-only>"
export OPENROUTER_MODEL="openrouter/free" # Or configured model tier

# Synapse Runtime Flags
export NODE_ENV="test"
export SYNAPSE_DATA_DIR="./.synapse_data/acceptance_test"
export SYNAPSE_WORKSPACES_DIR="./.synapse_workspaces/acceptance_test"
```

---

## 4. Test Execution Phases

The backend acceptance test exercises all 22 required validation phases:
1. **Environment Discovery & Configuration Validation**
2. **Relational Database Integrity (Transactions, Foreign Keys, Rollbacks, Multi-Tenancy)**
3. **Live OpenRouter API Connectivity & Safe Token Tracking**
4. **Live Cline Cognitive Reasoning & Plan Generation**
5. **Database Analysis & Schema Change Governance**
6. **Isolated Simulation Engine Sweep (Monte Carlo Prediction)**
7. **Dynamic Replanning under Optimistic Concurrency Control (V1 $\rightarrow$ V2)**
8. **Authoritative `OBSERVED_FACT` vs `AGENT_CLAIM` Resolution**
9. **Dynamic Workforce Spawning, Idempotency, and Crash Reconciliation**
10. **Human Operator Escalation, Approval, Rejection, and Fail-Closed Timeout**
11. **Multi-Level Emergency Kill Switch Enforcement**
12. **Zero-Trust Multi-Tenant Isolation across File, Session, and Graph Layers**
13. **Tool Gateway Adversarial Tampering Defense (9 Attack Vectors)**
14. **Crash Recovery & Persistence Durability from Store**
15. **Database Transient Outage & Recovery Handling**
16. **Durable Worker Queue Lease Expiration & Re-queueing**
17. **Realtime Event Stream & State Resynchronization**
18. **Long-Running Multi-Step Autonomous Mission Benchmark**
19. **Systematic Failure Injection Matrix**
20. **Definitive 15-Point Architecture Invariant Verification**
21. **Zero Production Mock Code Audit**
22. **Cost, Rate-Limit, and Resource Boundedness Enforcement**
