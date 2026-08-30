# SYNAPSE-OS — MCP Architecture

> Last verified: 2026-08-30

## Overview

SYNAPSE exposes governed capabilities through Cline's native MCP infrastructure.
External agents connect via MCP and invoke governed tools. Every invocation
passes through the ToolGateway governance pipeline.

```
┌─────────────────────────────────────────────────────────┐
│                  EXTERNAL AGENT / CLINE                  │
│            (MCP Client — native MCP protocol)            │
└──────────────────────┬──────────────────────────────────┘
                       │ MCP JSON-RPC
                       ▼
┌─────────────────────────────────────────────────────────┐
│              SYNAPSE MCP SERVER                          │
│    (@modelcontextprotocol/sdk McpServer)                 │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Governed Tools (14 domain capabilities)          │    │
│  │  • Execution Graph                               │    │
│  │  • Simulation                                    │    │
│  │  • Workforce                                     │    │
│  │  • Governance (Approval/Escalation)              │    │
│  │  • Observability                                 │    │
│  └─────────────────────┬───────────────────────────┘    │
│                        │                                 │
│  ┌─────────────────────▼───────────────────────────┐    │
│  │ Context Resolution                               │    │
│  │  • Derives authoritative identity from connection│    │
│  │  • BLOCKS if context missing (CR3)               │    │
│  │  • NEVER uses caller-supplied tenantId (CR5)     │    │
│  └─────────────────────┬───────────────────────────┘    │
└────────────────────────┼────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 TOOL GATEWAY                             │
│  (packages/tool-gateway/src/ToolGateway.ts)              │
│                                                          │
│  Precedence Pipeline:                                    │
│  0. Multi-Tenant Isolation                               │
│  1. Kill Switch (L1/L2/L3)                               │
│  2. Safety Engine (risk, secrets, injection)             │
│  3. Workspace Boundaries (path containment)              │
│  4. Policy Engine (tenant security rules)                │
│  5. Capability Authorizer (agent permissions)            │
│  6. Approval Engine (human sign-off)                     │
│  7. Authorization Token (HMAC-SHA256)                    │
│                                                          │
│  executeTool() → Authorization → Execution → Evidence    │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ Evidence │ │  Audit   │ │  Graph   │
    │  Store   │ │  Engine  │ │  Engine  │
    │ (Merkle) │ │ (SHA256) │ │(OBSERVED │
    │          │ │          │ │  _FACT)  │
    └──────────┘ └──────────┘ └──────────┘
```

## MCP Tool Registry

| Tool Name | Category | Description | Governance |
|-----------|----------|-------------|------------|
| `inspect_execution_graph` | Graph | Read current graph | Read-only, tenant-scoped |
| `inspect_frontier` | Graph | Read current frontier | Read-only, tenant-scoped |
| `submit_execution_plan` | Graph | Submit DAG plan | Full governance pipeline |
| `propose_replan` | Graph | Propose replan with OCC | Full governance + OCC validation |
| `request_simulation` | Simulation | Run simulation | Read-only simulation, isolated clone |
| `inspect_workforce` | Workforce | Read workforce graph | Read-only, tenant-scoped |
| `request_agent_spawn` | Workforce | Spawn governed agent | Full governance + idempotent |
| `request_approval` | Governance | Request human approval | Creates approval record |
| `request_escalation` | Governance | Request escalation | May freeze frontier at L3/4 |
| `inspect_mission` | Observability | Read mission state | Read-only, tenant-scoped |
| `inspect_observations` | Observability | Read observations | Read-only, tenant-scoped |
| `inspect_audit_events` | Observability | Read audit trail | Read-only, tenant-scoped |
| `report_observation` | Observability | Report OBSERVED_FACT | Validated, provenance-bound |

## Security Model

1. **No caller-supplied identity**: Context is derived from authenticated connection, never from MCP request payload
2. **No synthetic fallback**: Missing context → BLOCKED (CR3)
3. **Tenant isolation**: Precedence 0 validates tenantId against workspace
4. **Kill switch**: Precedence 1 checks L1/L2/L3 kill switch
5. **Full governance pipeline**: All 7 precedence levels enforced
6. **Authorization token**: HMAC-SHA256 bound to exact call parameters
7. **Audit trail**: Every MCP invocation logged with SHA-256 chain
8. **Evidence sealing**: Tool execution results cryptographically sealed
