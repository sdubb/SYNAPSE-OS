# SYNAPSE-OS — External MCP Acceptance

> Last verified: 2026-08-30

## Status: UNVERIFIED

External MCP client testing requires a running SYNAPSE backend with PostgreSQL and
a real MCP client connection. This document records the acceptance criteria and
current verification status.

## Acceptance Criteria

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | External MCP client can discover SYNAPSE tools | UNVERIFIED | Requires running MCP server with transport |
| 2 | External client can invoke a read-only tool | UNVERIFIED | Requires authenticated connection |
| 3 | External client can request a governed operation | UNVERIFIED | Requires full governance pipeline |
| 4 | External client receives real result | UNVERIFIED | Requires tool execution |
| 5 | Unauthorized request is blocked | UNVERIFIED | Requires governance pipeline |
| 6 | Cross-tenant request is blocked | UNVERIFIED | Requires tenant isolation |
| 7 | Replay attack is blocked | UNVERIFIED | Requires token validation |
| 8 | Argument tampering is blocked | UNVERIFIED | Requires hash validation |

## Blockers

1. **PostgreSQL unavailable** — Cannot verify persistence of audit/evidence records
2. **MCP transport not wired** — `SynapseMcpServer.mcpServer` needs a Transport (stdio/SSE/HTTP) for external clients to connect
3. **Tool execution stub** — The executor function in `executeGovernedTool` is a placeholder; real tool dispatch requires wiring to the governed executors

## What IS Verified (Code-Level)

| Aspect | Verified | Evidence |
|--------|----------|----------|
| MCP server construction | ✅ | `SynapseMcpServer` creates `McpServer` with 14 tools |
| Context registration | ✅ | `SynapseMcpBridge.registerConnection()` validates and stores context |
| Context resolution | ✅ | `resolveContext()` returns null if not registered → BLOCKED |
| Governance pipeline | ✅ | `ToolGateway.executeTool()` traverses all 7 precedences |
| Authorization token | ✅ | HMAC-SHA256 token issued, bound to call parameters |
| Audit logging | ✅ | `AuditEngine.logSecurityEvent()` called for every invocation |
| Event publishing | ✅ | `EventBus.publish()` emits tool.completed/blocked/failed events |
| Observation recording | ✅ | `ExecutionGraphEngine.recordObservation()` records OBSERVED_FACT |
| Security: missing tenant | ✅ | `registerConnection()` throws if tenantId is empty |
| Security: missing agent | ✅ | `registerConnection()` throws if agentId is empty |
| Security: missing session | ✅ | `registerConnection()` throws if sessionId is empty |

## Next Steps to Achieve Full Verification

1. Wire `SynapseMcpServer` to an MCP transport (stdio or SSE)
2. Connect a real MCP client to the transport
3. Register a connection with authoritative context
4. Invoke tools through the MCP client
5. Verify governance enforcement, audit trail, and evidence recording
6. Test attack vectors (cross-tenant, replay, argument tampering)
