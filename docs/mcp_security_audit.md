# SYNAPSE-OS — MCP Security Audit

> Last verified: 2026-08-30

## Security Architecture

Every MCP tool invocation traverses the same governance pipeline as Cline's native tools.
There is NO alternate execution path.

```
MCP Client → MCP Server → ToolGateway → Governance Pipeline → Execution
```

## Attack Matrix

| Attack Vector | Defense | Status |
|---------------|---------|--------|
| **Missing tenant** | CR3: BLOCKED if tenantId cannot be resolved from connection | ✅ |
| **Wrong tenant** | Precedence 0: workspace path validated against tenant | ✅ |
| **Forged session** | Connection context pre-registered, not caller-supplied | ✅ |
| **Forged mission** | Context derived from authenticated session, not MCP payload | ✅ |
| **Forged agent** | Agent identity from connection registration, not caller | ✅ |
| **Malformed arguments** | Zod schema validation on all MCP tool inputs | ✅ |
| **Replay attack** | Authorization token bound to callId + timestamp, one-time use | ✅ |
| **Argument mutation** | Token includes argumentHash — mutated args = invalid token | ✅ |
| **Unauthorized tool** | Capability Authorizer (Precedence 5) validates agent permissions | ✅ |
| **Capability escalation** | Policy Engine (Precedence 4) enforces tenant security rules | ✅ |
| **Workspace escape** | Workspace Boundaries (Precedence 3) enforces path containment | ✅ |
| **Kill switch bypass** | Kill Switch (Precedence 1) checked before any execution | ✅ |
| **Approval bypass** | Approval Engine (Precedence 6) halts for human sign-off | ✅ |
| **Audit bypass** | AuditEngine.logSecurityEvent() called for every invocation | ✅ |
| **Observation spoofing** | OBSERVED_FACT requires system provenance (callId, evidenceId, auditEventId) | ✅ |
| **Graph mutation bypass** | Graph mutations only through ExecutionGraphEngine.replan() with OCC | ✅ |

## Context Propagation Security

### Valid Path
```
Tenant A connection → registered with tenantId=A
  → MCP tool call → context resolved from connection (tenantId=A)
  → ToolGateway validates tenantId=A against workspace
  → ALLOWED
```

### Invalid Paths (All BLOCKED)
```
Tenant A connection → caller supplies tenantId=B in MCP args
  → context resolved from connection (tenantId=A, not B)
  → BLOCKED: caller cannot override tenant
```

```
No connection registered → context resolution returns null
  → BLOCKED: "Cannot resolve authoritative context"
```

```
Connection with empty tenantId → registerConnection() throws
  → BLOCKED: "Cannot register MCP connection without authoritative context"
```

## Zero Bypass Verification

| Potential Bypass | Verified Blocked |
|-----------------|-----------------|
| Direct executor invocation | ✅ — `createGovernedExecutors()` wraps all executors |
| Direct filesystem execution | ✅ — Workspace Boundaries (Precedence 3) |
| Direct shell execution | ✅ — Policy Engine (Precedence 4) |
| Direct database execution | ✅ — All execution through ToolGateway |
| Direct agent spawning | ✅ — Workforce registration only through governed path |
| Direct graph mutation | ✅ — ExecutionGraphEngine validates state transitions |
| MCP tool bypassing ToolGateway | ✅ — SynapseMcpServer calls ToolGateway.executeTool() |
| MCP tool bypassing tenant validation | ✅ — Precedence 0 validates tenant |
| MCP tool bypassing capability validation | ✅ — Precedence 5 validates capabilities |
| MCP tool bypassing approval | ✅ — Precedence 6 halts for human sign-off |
| MCP tool bypassing audit | ✅ — AuditEngine.logSecurityEvent() called for every invocation |

## Authentication Model

MCP connections must be registered with `SynapseMcpBridge.registerConnection()` before any tool can be invoked.
Registration requires:
- `tenantId` — non-empty, derived from authenticated session
- `agentId` — non-empty, derived from authenticated session
- `sessionId` — non-empty, derived from authenticated session

Missing any of these → registration is BLOCKED.
No synthetic identity fallback.
