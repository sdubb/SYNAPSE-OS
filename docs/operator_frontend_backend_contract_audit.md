# SYNAPSE-OS — OPERATOR FRONTEND-BACKEND CONTRACT AUDIT

**Document**: `docs/operator_frontend_backend_contract_audit.md`  
**Date**: 2026-08-31  
**Status**: COMPLETE — ZERO MISSING CONTRACTS  

---

## 1. Executive Summary

This audit catalogs all frontend data requirements in `apps/web` across REST endpoints and WebSocket realtime events. It establishes the authoritative source, persistence engine, and synchronization behavior for every UI element.

---

## 2. Frontend-Backend Contract Matrix

| UI Requirement | Endpoint / Event | Authoritative Source | DB / Engine Store | Existing? | Gap / Resolution |
|---|---|---|---|:---:|---|
| **Mission List** | `GET /api/v1/sessions` | `AppController.getSessions()` | `PostgreSQL sessions / FileGraphStore` | **YES** | None. Returns typed `SynapseSession[]`. |
| **Mission Cockpit Header** | `GET /api/v1/sessions/:id` | `AppController.getSessionById()` | `sessions table + GraphStore` | **YES** | None. Includes `objective`, `status`, `riskLevel`, `graphVersion`. |
| **Live Execution Graph** | `GET /api/v1/sessions/:id` | `ExecutionGraphEngine.getGraph()` | `FileGraphStore (${id}_v${ver}.json)` | **YES** | None. DAG nodes & edges fully rendered. |
| **Execution Frontier** | `GET /api/v1/sessions/:id` | `ExecutionGraphEngine.getFrontier()` | In-Memory Graph DAG Engine | **YES** | Authoritative frontier returned and highlighted. |
| **Cline Primary Brain Card** | `GET /api/v1/sessions/:id/messages` | `ClineSession.getCollectedMessages()` | `session_messages` | **YES** | Returns thoughts, intents, strategy, next actions. |
| **Live Activity Stream** | `WS: *` (`tool.completed`, etc.) | `EventBus` | `audit_ledger` | **YES** | Events tagged with actor (`CLINE`, `SYNAPSE`, `SIMULATION`). |
| **Pending Approvals Tray** | `GET /api/v1/approvals` | `ApprovalEngine.getPendingApprovals()`| `approval_requests` table | **YES** | Lists tool parameters, reason, risk level. |
| **Approval Mutation** | `POST /api/v1/approvals/:id/resolve` | `ApprovalResolver.resolve()` | `ApprovalEngine` + Audit | **YES** | One-click resolve (`APPROVED` / `REJECTED`). |
| **Mission Pause / Resume** | `POST /api/v1/sessions/:id/pause` | `ClineSession.pause()` / `resume()` | `RuntimeManager` | **YES** | State changes broadcast via WebSocket. |
| **Emergency Kill-Switch** | `POST /api/v1/security/kill-switch` | `KillSwitch.trigger()` | `SafetyEngine` | **YES** | Immediate priority halt broadcast across runtimes. |
| **Workforce Kanban** | `GET /api/v1/agents` | `WorkforceGraphEngine.getWorkforce()` | `workforce_nodes` | **YES** | Grouped into 7 columns with Cline as Primary Brain. |
| **Agent Spawn Request** | `POST /api/v1/agents` | `WorkforceGraphEngine.registerSpawn()`| `workforce_nodes` | **YES** | Subagent registered with parent lineage. |
| **Prediction vs Reality** | `GET /api/v1/simulations` | `SimulationEngine.runMonteCarlo()` | `simulation_records` | **YES** | Displays predicted vs observed failure rates & accuracy. |
| **Forensic Evidence Explorer**| `GET /api/v1/audit` | `AuditEngine.query()` | `audit_ledger (SHA-256 Merkle)` | **YES** | Full cryptographic hash chain with verification lock. |
| **System Health Telemetry** | `GET /health` | `HealthController.check()` | System health probes | **YES** | Reports status of API, WS, Engine, and Audit. |
| **Safe Provider Credentials**| `GET /api/v1/provider-credentials` | `ProviderCredentialResolver` | `provider_credentials (AES-256-GCM)` | **YES** | Exposes only safe metadata (`keyPrefix`); 0 plaintext. |
| **Credential Rotation** | `POST /api/v1/provider-credentials/:id/rotate` | `ProviderCredentialResolver.rotate()`| `provider_credentials` | **YES** | Revokes old key, encrypts new key, returns safe metadata. |
| **Credential Revocation** | `DELETE /api/v1/provider-credentials/:id` | `ProviderCredentialResolver.revoke()`| `provider_credentials` | **YES** | Immediately revokes credential. |

---

## 3. Realtime WebSocket Event Contract

| Event Type | Channel / Topic | Payload Contract | Tenant Bound? | Reconnect Resync |
|---|---|---|:---:|:---:|
| `mission.created` | `tenant:${tenantId}`, `mission:${missionId}` | `{ missionId, objective, status, version }` | **YES** | Invalidate `['sessions']` |
| `mission.updated` | `session:${sessionId}`, `mission:${missionId}` | `{ missionId, status, graphVersion, tokenUsage }`| **YES** | Invalidate `['sessions', id]` |
| `mission.status_changed` | `session:${sessionId}`, `mission:${missionId}`| `{ missionId, previousStatus, newStatus }` | **YES** | Invalidate `['sessions', id]` |
| `graph.updated` | `graph:${tenantId}`, `session:${sessionId}` | `{ graphVersion, nodeCount, frontier }` | **YES** | Re-render DAG |
| `node.started` | `session:${sessionId}`, `graph:${tenantId}` | `{ nodeId, agentId, startedAt }` | **YES** | Update node state |
| `node.completed` | `session:${sessionId}`, `graph:${tenantId}` | `{ nodeId, durationMs, evidenceId }` | **YES** | Update node state |
| `node.failed` | `session:${sessionId}`, `graph:${tenantId}` | `{ nodeId, error, retryCount }` | **YES** | Update node state |
| `tool.requested` | `session:${sessionId}`, `agent:${agentId}` | `{ toolName, arguments, callId }` | **YES** | Activity stream |
| `tool.completed` | `session:${sessionId}`, `tenant:${tenantId}` | `{ toolName, success, durationMs, evidenceId }` | **YES** | Activity stream |
| `approval.created` | `approvals:${tenantId}`, `tenant:${tenantId}` | `{ approvalId, toolName, riskLevel, reason }` | **YES** | Needs You drawer |
| `approval.resolved` | `approvals:${tenantId}`, `session:${sessionId}` | `{ approvalId, decision, resolvedBy }` | **YES** | Needs You drawer |
| `agent.started` | `workforce:${tenantId}`, `agent:${agentId}` | `{ agentId, role, status, model }` | **YES** | Invalidate `['agents']` |
| `agent.updated` | `workforce:${tenantId}`, `agent:${agentId}` | `{ agentId, status, workload, tokens }` | **YES** | Update Kanban card |
| `agent.completed` | `workforce:${tenantId}`, `agent:${agentId}` | `{ agentId, status: 'COMPLETED' }` | **YES** | Update Kanban card |
| `observation.recorded`| `session:${sessionId}`, `graph:${tenantId}` | `{ observationId, nodeId, source, data }` | **YES** | Node inspector |
| `audit.recorded` | `audit:${tenantId}`, `tenant:${tenantId}` | `{ eventId, sequence, hash, previousHash }` | **YES** | Evidence explorer |
| `cline.status_changed` | `session:${sessionId}`, `agent:${agentId}` | `{ status, activeAction, currentPlan }` | **YES** | Cline Brain card |
| `session.updated` | `session:${sessionId}`, `tenant:${tenantId}` | `{ sessionId, tokenUsage, estimatedCostUsd }`| **YES** | Top HUD banner |

---

## 4. Contract Guardian Confirmation

1. **Zero Frontend Fabrication**: Every UI element in `apps/web` is mapped to an authoritative backend API endpoint or typed WebSocket event.
2. **Zero Plaintext Secret Exposure**: All credential requests return `SafeCredentialMetadata` (masked `keyPrefix`).
3. **Strict Tenant Isolation**: WebSocket router verifies `client.tenantId === event.tenantId` for 100% of transmissions.
