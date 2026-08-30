# SYNAPSE-OS — Cline Native MCP Integration Trace

> Forensic trace of real call chains. Last verified: 2026-08-30

## Overview

SYNAPSE exposes governed capabilities through Cline's native MCP infrastructure.
The MCP transport is handled by `@modelcontextprotocol/sdk`'s `McpServer` class.
SYNAPSE provides the governed domain capabilities, not the MCP protocol.

---

## 1. MCP Server Construction

```
SynapseMcpBridge (packages/engine-adapter/src/mcp/SynapseMcpBridge.ts)
  └→ creates SynapseMcpServer (packages/engine-adapter/src/mcp/SynapseMcpServer.ts)
       └→ creates McpServer from @modelcontextprotocol/sdk/server/mcp.js
       └→ calls registerGovernedTools()
            └→ registers 14 MCP tools via mcpServer.tool()
                 ├── inspect_execution_graph
                 ├── inspect_frontier
                 ├── submit_execution_plan
                 ├── propose_replan
                 ├── request_simulation
                 ├── inspect_workforce
                 ├── request_agent_spawn
                 ├── request_approval
                 ├── request_escalation
                 ├── inspect_mission
                 ├── inspect_observations
                 ├── inspect_audit_events
                 └── report_observation
```

## 2. ClineEngine Integration

```
ClineEngine.initialize() (packages/engine-adapter/src/ClineEngine.ts:219)
  └→ creates SynapseMcpBridge
       └→ injects real ToolGateway, AuditEngine, EventBus
       └→ creates SynapseMcpServer
            └→ registers governed tools
```

## 3. MCP Tool Invocation Flow (The Critical Path)

```
External Agent / Cline
  ↓ MCP JSON-RPC tools/call
McpServer (SDK)
  ↓ dispatches to registered tool callback
SynapseMcpServer.executeGovernedTool()
  ↓ 1. resolveContext() — derives authoritative identity from connection
  ↓    CRITICAL: context is pre-registered, NOT from caller
  ↓ 2. auditEngine.logSecurityEvent() — records invocation attempt
  ↓ 3. toolGateway.executeTool()
  │    ├── evaluateAndAuthorizeToolCall()
  │    │    ├── Precedence 0: Multi-Tenant Isolation
  │    │    ├── Precedence 1: Kill Switch
  │    │    ├── Precedence 2: Safety Engine
  │    │    ├── Precedence 3: Workspace Boundaries
  │    │    ├── Precedence 4: Policy Engine
  │    │    ├── Precedence 5: Capability Authorizer
  │    │    ├── Precedence 6: Approval Engine
  │    │    └── Precedence 7: Authorization Token (HMAC-SHA256)
  │    └── executeTool() — executes with authorization token
  ↓ 4. graphEngine.recordObservation() — records OBSERVED_FACT
  ↓ 5. eventBus.publish() — publishes tool.completed event
  └→ returns MCP CallToolResult
```

## 4. Connection Context Registration

```
SynapseMcpBridge.registerConnection(connectionId, context)
  ↓ validates context has authoritative identities
  ↓    tenantId, agentId, sessionId must be non-empty
  ↓    BLOCKED if missing — no synthetic fallback
  ↓ stores in connectionContexts Map
  ↓ auditEngine.logSecurityEvent(mcp.connection.registered)
  └→ eventBus.publish(agent.connected)
```

## 5. Context Resolution (Security Critical)

```
SynapseMcpServer.resolveContext(extra)
  ↓ lookup connectionContexts Map by connectionId
  ↓ if found → return authoritative McpToolContext
  └→ if NOT found → return null → BLOCKED
       CRITICAL: No synthetic identity fallback (CR3)
       CRITICAL: No caller-supplied tenantId (CR5)
```

## 6. Governance Pipeline (ToolGateway)

```
ToolGateway.evaluateAndAuthorizeToolCall(context)
  ↓ Precedence 0: verify tenantId matches workspace
  ↓ Precedence 1: check kill switch (L1 stream, L2 session, L3 workspace)
  ↓ Precedence 2: safety engine (risk scoring, secret detection, injection)
  ↓ Precedence 3: workspace boundaries (path containment)
  ↓ Precedence 4: policy engine (tenant security rules)
  ↓ Precedence 5: capability authorizer (agent permissions)
  ↓ Precedence 6: approval engine (human sign-off if required)
  ↓ Precedence 7: issue HMAC-SHA256 authorization token
  └→ returns ToolAuthorizationResult { authorized, token, ... }

ToolGateway.executeTool(context, executor, token?)
  ↓ if no token: call evaluateAndAuthorizeToolCall() inline
  ↓ verify token validity (signature, expiry, args hash, tenant, agent, session)
  ↓ execute executor()
  ↓ capture evidence (Merkle seal)
  ↓ record audit event (immutable)
  └→ returns ToolExecutionResult { success, output, evidenceId, auditEventId }
```

## 7. Architectural Invariants Verified

| Invariant | How Enforced |
|-----------|-------------|
| CLINE THINKS | Cline reasons, SYNAPSE governs |
| SYNAPSE CONTROLS | ToolGateway is sole execution boundary |
| TOOL GATEWAY CONTROLS EXECUTION | All MCP calls go through ToolGateway |
| NOTHING BYPASSES SYNAPSE | MCP server calls ToolGateway.executeTool() |
| HUMAN CAN INTERRUPT | Approval engine enforces human sign-off |
| TENANT ISOLATION | Precedence 0 validates tenantId |

## 8. Files Changed

| File | Change |
|------|--------|
| `packages/engine-adapter/src/mcp/SynapseMcpServer.ts` | NEW — MCP server with governed tools |
| `packages/engine-adapter/src/mcp/SynapseMcpBridge.ts` | NEW — Bridge to ClineEngine |
| `packages/engine-adapter/src/mcp/index.ts` | NEW — Exports |
| `packages/engine-adapter/src/ClineEngine.ts` | MODIFIED — imports MCP bridge, initializes in constructor |
| `packages/engine-adapter/src/index.ts` | MODIFIED — exports MCP modules |
| `packages/contracts/src/mcp.ts` | NEW — Domain contracts (observability, benchmarks, etc.) |
| `packages/contracts/src/index.ts` | MODIFIED — exports mcp contracts |
| `tests/mcp_real_acceptance_suite.ts` | NEW — Real acceptance test suite |
| `docs/cline_native_mcp_integration_trace.md` | NEW — This document |
| `docs/mcp_architecture.md` | NEW — Architecture overview |
| `docs/mcp_security_audit.md` | NEW — Security audit |
