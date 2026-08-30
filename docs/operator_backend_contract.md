# SYNAPSE-OS — Operator Backend Contract

> Auto-discovered from source. Last verified: 2026-08-30 (forensic integration audit)

## Overview

The SYNAPSE backend exposes a REST API at `/api/v1` and a WebSocket realtime server on port 3001. All routes are tenant-scoped via `X-Tenant-Id` header and authenticated via `Authorization: Bearer <token>`.

---

## Authentication

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/v1/auth/login` | POST | `{ apiKeyOrUser, tenantId? }` | `{ token, userId, tenantId, expiresIn }` |
| `/api/v1/auth/me` | GET | — | `{ user, tenantId }` |

---

## Health & Observability

| Endpoint | Method | Response |
|----------|--------|----------|
| `/health` | GET | `{ status, services, version, database, engine }` |
| `/health/live` | GET | `{ status: "UP", timestamp }` |
| `/health/ready` | GET | Same as `/health` |
| `/health/engine` | GET | ClineEngine health status |
| `/health/metrics` | GET | Prometheus text format |
| `/health/cost?tenantId=` | GET | Cost summary for tenant |

---

## Sessions (Cline Runtime)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/sessions` | GET | List sessions for tenant |
| `/api/v1/sessions` | POST | Create new session |
| `/api/v1/sessions/:id` | GET | Get session by ID |
| `/api/v1/sessions/:id/messages` | GET | Get Cline messages |
| `/api/v1/sessions/:id/interventions` | POST | Send operator instruction |
| `/api/v1/sessions/:id/messages` | POST | Send message (alternative) |
| `/api/v1/sessions/:id/usage` | GET | Token usage stats |
| `/api/v1/sessions/:id/pause` | POST | Pause session |
| `/api/v1/sessions/:id/resume` | POST | Resume session |
| `/api/v1/sessions/:id/stop` | POST | Stop/cancel session |
| `/api/v1/sessions/:id/timeline` | GET | Session timeline events |
| `/api/v1/sessions/:id/files` | GET | Workspace file tree |
| `/api/v1/sessions/:id/diff` | GET | Code diff |
| `/api/v1/sessions/:id/tools` | GET | Tool executions (returns `[]`) |

**Session Schema** (from `@synapse/contracts`):
```ts
{
  id: string (uuid)
  tenantId: string (uuid)
  agentId: string (uuid)
  taskId?: string (uuid)
  clineSessionId: string
  workspaceId: string (uuid)
  runtimeId: string (uuid)
  status: "initializing" | "active" | "paused" | "awaiting_input" | "awaiting_approval" | "completed" | "aborted" | "failed" | "timed_out"
  mode: "interactive" | "batch" | "scheduled" | "simulation" | "verification"
  tokenUsage: { promptTokens, completionTokens, totalTokens, estimatedCostUsd }
  runtimeMetadata: { runtimeId, hostMode, hostname, pid, workingDirectory, gitBranch, ... }
}
```

---

## Tasks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/tasks` | GET | List tasks |
| `/api/v1/tasks` | POST | Create task |
| `/api/v1/tasks/:id` | GET | Get task by ID |

**Task Schema** (from `@synapse/contracts`):
```ts
{
  id: string (uuid)
  tenantId: string (uuid)
  missionId?: string (uuid)
  title: string
  status: TaskStatus
  priority: TaskPriority
  assignedAgentId?: string (uuid)
  workspaceId: string (uuid)
  instructions: string
  dependencies: TaskDependency[]
  retryPolicy: { maxRetries, currentRetry, backoffMs, exponential }
}
```

---

## Agents

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/agents` | GET | List agents |
| `/api/v1/agents` | POST | Create agent |
| `/api/v1/agents/:id` | GET | Get agent by ID |

**Agent Schema** (from `@synapse/contracts`):
```ts
{
  id: string (uuid)
  tenantId: string (uuid)
  identity: { name, description, role, tags }
  instructions: { systemPrompt, objectives, behavioralRules }
  capabilities: { tools, mcpServers, connectors, filesystem, network, terminal, subagents }
  model: { provider, modelId, temperature, maxTokens }
  permissions: { files, shell, network, credentials, productionAccess }
  verification: { strategies, approvalRequirements, minConfidence }
  resourceLimits: { maxTokens, maxRuntimeSeconds, maxCostUsd, maxConcurrency }
}
```

---

## Teams

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/teams` | GET | Returns `[]` (not yet persisted) |
| `/api/v1/teams` | POST | Returns 501 NOT_IMPLEMENTED |

**Backend Capability Required:** Teams persistence (add `teams` table to database schema).

---

## Approvals

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/approvals` | GET | List approval requests |
| `/api/v1/approvals` | POST | Create approval request |
| `/api/v1/approvals/:id/decision` | POST | Submit decision |
| `/api/v1/approvals/:id/resolve` | POST | Resolve approval |

**Approval Schema** (from `@synapse/contracts`):
```ts
{
  id: string (uuid)
  tenantId: string (uuid)
  agentId: string (uuid)
  sessionId: string (uuid)
  clineSessionId: string
  callId: string
  toolName: string
  toolParameters: Record<string, unknown>
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  status: "pending" | "approved" | "rejected" | "timed_out" | "auto_approved" | "cancelled"
  timeoutSeconds: number
  expiresAt: string (datetime)
  createdAt: string (datetime)
}
```

**Decision Flow:**
```
USER CLICKS APPROVE → POST /approvals/:id/resolve → WAIT FOR RESPONSE → REFRESH
```

---

## Policies

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/policies` | GET | List policies |
| `/api/v1/policies` | POST | Create policy |

**Policy Schema** (from `@synapse/contracts`):
```ts
{
  id: string (uuid)
  tenantId: string (uuid)
  name: string
  scope: "global" | "tenant" | "workspace" | "agent" | "tool" | "command" | "filesystem" | "network"
  rules: PolicyRule[]
  defaultDecision: "ALLOW" | "BLOCK" | "REQUIRE_APPROVAL"
  enabled: boolean
}
```

---

## Verification

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/verification` | GET | List verification runs |
| `/api/v1/verification` | POST | Create verification |
| `/api/v1/verification/:id` | GET | Get verification by ID |

**Verification Schema** (from `@synapse/contracts`):
```ts
{
  id: string (uuid)
  planId: string (uuid)
  overallVerdict: "PASS" | "FAIL" | "INCONCLUSIVE" | "SKIPPED"
  assertionResults: AssertionResult[]
  summary?: string
}
```

---

## Audit

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/audit` | GET | Query audit records (limit, offset, eventType) |
| `/api/v1/audit` | POST | Query audit records (body filters) |
| `/api/v1/audit/verify` | GET | Verify audit chain integrity (startSeq, endSeq) |
| `/api/v1/audit/export` | GET | Export audit trail (format: JSON, JSONL, CSV, CEF, SYSLOG) |

**Audit Response:**
```ts
{ records: AuditRecord[], total: number, hasMore: boolean }
```

---

## World Model

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/world/entities` | GET | List world entities |
| `/api/v1/world/entities` | POST | Create world entity |
| `/api/v1/world/relationships` | GET | List relationships |
| `/api/v1/world/topology` | GET | Combined entities + relationships |

---

## Simulations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/simulations` | GET | List simulation runs |
| `/api/v1/simulations` | POST | Create simulation |

---

## Security

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/security/roles` | GET | List available roles |
| `/api/v1/security/kill-switch` | POST | Emergency kill switch |

---

## Providers

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/providers` | GET | List provider keys |

---

## WebSocket Realtime

**Connection:** `ws://host:3001?token=<jwt>&tenantId=<uuid>`

**Protocol:**
- Client sends: `{ action: "SUBSCRIBE", channel: "<channel>" }`
- Client sends: `{ action: "UNSUBSCRIBE", channel: "<channel>" }`
- Client sends: `{ action: "PING" }`
- Server sends: `{ type: "CONNECTED", connectionId, tenantId, userId }`
- Server sends: `{ type: "EVENT", data: SynapseEventEnvelope }`
- Server sends: `{ type: "PONG", timestamp }`

**Auto-subscribed channels:**
- `tenant:{tenantId}` — All events for the tenant

**Event Envelope Schema** (from `@synapse/contracts`):
```ts
{
  eventId: string (uuid)
  eventType: SynapseEventType
  tenantId: string (uuid)
  missionId?: string
  agentId?: string
  sessionId?: string
  taskId?: string
  runId?: string
  timestamp: number
  source: SynapseEventSource
  payload: Record<string, unknown>
  sequence: number
}
```

**Key Event Types:**
- `session.*`, `task.*`, `agent.*` — Lifecycle events
- `tool.*` — Tool execution events
- `graph.*` — Graph node/version/branch events
- `simulation.*` — Simulation lifecycle
- `verification.*` — Verification results
- `audit.*` — Audit entries
- `workforce.*` — Agent spawn/terminate
- `approval.*` — Approval requests

---

## Execution Graph (File-Based, No REST Endpoint)

Graphs are stored in `.synapse_data/graphs/` as JSON files:
- `{graphId}_v{version}.json` — Immutable graph version
- `{graphId}_versions.json` — Version history
- `{graphId}_latest.json` — Latest version symlink

**ExecutionGraph Schema** (from `@synapse/contracts`):
```ts
{
  id: string
  tenantId: string
  missionId: string
  taskId?: string
  version: number
  nodes: GraphNode[]
  edges: GraphEdge[]
  objective: string
  risk: Record<string, unknown>
  approvalPoints: string[]
  escalationPoints: string[]
  verificationPlan: string[]
  createdAt: string (datetime)
  updatedAt: string (datetime)
}
```

**GraphNode Schema:**
```ts
{
  id: string
  type: "ACTION" | "CONDITION" | "BRANCH" | "MERGE" | "RETRY" | "FALLBACK" | "APPROVAL" | "ESCALATION" | "VERIFICATION" | "END"
  title: string
  description?: string
  state: "CREATED" | "QUEUED" | "RUNNING" | "WAITING" | "BLOCKED" | "PAUSED" | "FAILED" | "VERIFYING" | "COMPLETED" | "TERMINATED"
  action?: string
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  startedAt?: string
  completedAt?: string
  error?: string
  output?: unknown
  attempts: number
}
```

**GraphEdge Schema:**
```ts
{
  id: string
  from: string
  to: string
  condition?: string
  priority: number
  traversalCount: number
}
```

**PlanVersion Schema:**
```ts
{ version: number, graphId: string, createdAt: string, reason: string }
```

**Frontier:** Nodes with state `RUNNING`, `WAITING`, `QUEUED`, or `PAUSED`. If none, entry nodes (in-degree 0) with state `CREATED`.

**Escalation Levels:** `LEVEL_1`, `LEVEL_2`, `LEVEL_3`, `LEVEL_4`

---

## Workforce (In-Memory, No REST Endpoint)

The `WorkforceGraphEngine` tracks agent spawn/terminate events in memory.

**WorkforceNode:**
```ts
{
  agentId: string
  parentAgentId?: string
  teamId?: string
  missionId: string
  taskId?: string
  runId?: string
  status: "ACTIVE" | "TERMINATED" | "PAUSED"
  createdAt: string
  updatedAt: string
}
```

**Frontend Approach:** Use active sessions as proxy for workforce data. Subscribe to `workforce.agent.spawned` and `workforce.agent.terminated` events via WebSocket.

---

## Backend Capabilities Required (Missing Endpoints)

| Capability | Status | Frontend Handling |
|-----------|--------|-------------------|
| `GET /missions` | Not implemented | Use tasks with missionId as proxy |
| `GET /missions/:id/graph` | Not implemented | Read from `.synapse_data/graphs/` or show "Execution graph unavailable" |
| `GET /escalations` | Not implemented | Track via WebSocket events, show empty state |
| `GET /workforce` | Not implemented | Use active sessions as proxy |
| `GET /teams` | Returns `[]` | Show "No teams configured" |
| Graph version comparison | No endpoint | Read version files from `.synapse_data/graphs/` |
