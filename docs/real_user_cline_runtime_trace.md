# SYNAPSE-OS — Real User → Cline Runtime Trace

**Date:** September 1, 2026  
**Scope:** Complete call chain from human authentication through Cline cognitive execution to evidence persistence  
**Status:** Forensic verification of existing architecture

---

## 1. Executive Summary

This trace documents the **actual source code paths** through which a real authenticated SYNAPSE-OS user can:
- Authenticate and establish a verified session
- Configure encrypted provider credentials
- Create and execute a mission through the embedded Cline cognitive engine
- Have every tool request governed by the Synapse ToolGateway
- Receive evidence, audit, and event records for every operation

**Invariant:** Cline is the primary cognitive brain. Synapse provides governance. ToolGateway is the sole execution boundary.

---

## 2. Complete Call Chain

```
HUMAN (Browser/CLI)
  │
  ▼
SYNAPSE AUTH
  │  POST /api/v1/auth/register → apps/backend/src/routes/auth.routes.ts:authRouter.post('/register')
  │  POST /api/v1/auth/login    → apps/backend/src/routes/auth.routes.ts:authRouter.post('/login')
  │  GET  /api/v1/auth/me       → apps/backend/src/routes/auth.routes.ts:authRouter.get('/me')
  │
  │  Controller: packages/security/src/authentication/jwt.ts:JwtService.sign()
  │  JWT Claims: { sub: userId, tid: tenantId, email, role, permissions, iat, exp, iss, aud }
  │
  ▼
MIDDLEWARE (JWT Verification → Tenant Context)
  │  apps/backend/src/middleware/auth.ts:authMiddleware()
  │  - Verifies JWT signature (HMAC-SHA256)
  │  - Extracts userId, tenantId from JWT claims (NOT headers)
  │  - Sets req.user = { userId, tenantId, roles, permissions }
  │
  │  apps/backend/src/middleware/tenant.ts:tenantMiddleware()
  │  - Cross-tenant protection: user tenant must match request tenant
  │  - Sets req.tenantId = verified tenant from JWT
  │  - Creates AsyncLocalStorage tenant context via TenantContext.run()
  │
  ▼
USER / ORGANIZATION / WORKSPACE / RBAC
  │  packages/tenancy/src/TenantContext.ts:TenantContext.run()
  │  - AsyncLocalStorage isolation per request
  │  - Requires non-empty tenantId (throws TenantContextError if missing)
  │
  ▼
PROVIDER CREDENTIAL CONFIGURATION
  │  POST /api/v1/provider-credentials → apps/backend/src/routes/provider-credentials.routes.ts
  │  - Encrypts plaintext key: packages/security/src/provider-credential-resolver.ts:ProviderCredentialResolver.storeCredential()
  │  - Returns SafeCredentialMetadata (NEVER plaintext)
  │
  │  Resolution: ProviderCredentialResolver.resolve()
  │  - Verifies userId + organizationId ownership
  │  - AES-256-GCM decryption (only in trusted backend)
  │  - Returns in-memory ResolvedCredential (ephemeral)
  │
  ▼
CLINE ENGINE INITIALIZATION
  │  packages/engine-adapter/src/ClineEngine.ts:ClineEngine.initialize()
  │  - Creates ClineCore with governed capabilities
  │  - requestToolApproval callback → handleClineToolApproval()
  │  - toolExecutors → createGovernedExecutors()
  │  - MCP bridge → SynapseMcpBridge (all MCP through ToolGateway)
  │
  ▼
MISSION CREATION & SESSION START
  │  ClineEngine.startSession(options)
  │  - Creates ClineSession with tenant/agent/mission metadata
  │  - Registers in activeSessions map BEFORE execution
  │  - Calls executeStart() lifecycle handler
  │
  │  packages/engine-adapter/src/ClineSession.ts:ClineSession
  │  - EventAdapter: ClineEventAdapter (ClineCore events → SynapseEventEnvelope)
  │  - ApprovalBridge: ClineApprovalBridge (approval state tracking)
  │  - Token tracking: model-aware cost calculation
  │
  ▼
CLINE COGNITIVE REASONING
  │  ClineCore receives: provider, model, ephemeral credential, mission context
  │  Cline performs autonomous reasoning and planning
  │  Cline generates tool requests based on reasoning
  │
  ▼
TOOL REQUEST INTERCEPTION
  │  ClineCore → requestToolApproval callback
  │  packages/engine-adapter/src/ClineEngine.ts:handleClineToolApproval()
  │  - Resolves session context (from activeSessions or sessionResolver)
  │  - CR3: BLOCK if tenant/agent identity missing (no synthetic fallback)
  │  - Delegates to ToolGateway.evaluateAndAuthorizeToolCall()
  │
  ▼
SYNAPSE TOOLGATEWAY
  │  packages/tool-gateway/src/ToolGateway.ts:ToolGateway.evaluateAndAuthorizeToolCall()
  │
  │  1. Emit tool.requested event
  │  2. SafetyPolicyPipeline.evaluate() (7-Precedence Pipeline):
  │     Level 0: Multi-Tenant Context Check (CR3: no tenant = BLOCK)
  │     Level 1: System Kill Switch Check
  │     Level 2: SafetyEngine Risk Analysis (secret detection, prompt injection, destructive commands)
  │     Level 3: WorkspaceEnforcer Path Containment
  │     Level 4: PolicyEngine Evaluation (command/file/network rules)
  │     Level 5: CapabilityAuthorizer Check (agent → tool capability mapping)
  │     Level 6: Approval Requirement Check (HIGH risk = REQUIRE_APPROVAL)
  │     Level 7: ALLOW
  │
  │  3. Handle BLOCK → tool.blocked event + audit
  │  4. Handle REQUIRE_APPROVAL → ApprovalEngine.requestApproval() → pending
  │  5. Handle ALLOW → GenerateAuthorizationToken() (HMAC-SHA256 signed)
  │
  ▼
AUTHORIZATION TOKEN
  │  packages/tool-gateway/src/ToolGateway.ts:generateAuthorizationToken()
  │  - Binds: tokenId, argumentsHash (SHA-256), callId, toolName, tenantId, agentId, sessionId
  │  - HMAC-SHA256 signature over all fields
  │  - TTL: 30 seconds (configurable)
  │
  │  ClineEngine stores token in pendingToolCalls map
  │  Token returned to ClineCore as { approved: true }
  │
  ▼
TOOL EXECUTION
  │  ClineCore calls governed executor (createGovernedExecutors wrapper)
  │  packages/engine-adapter/src/ClineEngine.ts:governed executor
  │  - Looks up pending token by callId
  │  - Validates token exists (no direct execution without authorization)
  │  - Delegates to ToolGateway.executeTool()
  │
  │  packages/tool-gateway/src/ToolGateway.ts:ToolGateway.executeTool()
  │  - Validates authorization token (signature, expiry, context binding, argument hash)
  │  - Consumes token (replay prevention)
  │  - Executes through provided executor
  │  - Redacts secrets from output (SecretRedactor)
  │  - Stores evidence (SHA-256 hashed)
  │  - Records audit event
  │  - Emits tool.completed event
  │
  ▼
EVIDENCE / AUDIT / PERSISTENCE
  │  EvidenceStore.storeEvidence() → packages/evidence/src/EvidenceStore.ts
  │  - SHA-256 content hash
  │  - Tenant-scoped storage
  │  - Optional filesystem persistence
  │
  │  AuditEngine.logSecurityEvent() → packages/audit-engine/src/AuditEngine.ts
  │  - Tamper-evident audit chain
  │  - Actor binding (tenantId, agentId)
  │  - Event type classification
  │
  │  EventBus.publish() → packages/event-bus/src/EventBus.ts
  │  - Correlated events (tenantId, agentId, missionId, sessionId, callId)
  │  - WebSocket/Realtime delivery to Operator UI
  │
  ▼
OPERATOR UI
  │  Event stream → apps/realtime/ → apps/web/src/
  │  - Cline status, current mission, active DAG node
  │  - Tool request, governance decision, approval state
  │  - Execution result, evidence, token usage, cost
```

---

## 3. Source File Reference

| Component | Source File | Key Functions |
|-----------|------------|---------------|
| **Auth Routes** | `apps/backend/src/routes/auth.routes.ts` | `login`, `register`, `me`, `api-keys` |
| **Auth Controller** | `apps/backend/src/controllers/auth.controller.ts` | `AuthController.login()`, `AuthController.register()` |
| **JWT Service** | `packages/security/src/authentication/jwt.ts` | `JwtService.sign()`, `JwtService.verify()` |
| **Auth Middleware** | `apps/backend/src/middleware/auth.ts` | `authMiddleware()` — JWT verification + API key |
| **Tenant Middleware** | `apps/backend/src/middleware/tenant.ts` | `tenantMiddleware()` — Cross-tenant protection |
| **Tenant Context** | `packages/tenancy/src/TenantContext.ts` | `TenantContext.run()`, `TenantContext.require()` |
| **Provider Credentials** | `apps/backend/src/routes/provider-credentials.routes.ts` | CRUD for encrypted credentials |
| **Provider Resolver** | `packages/security/src/provider-credential-resolver.ts` | `storeCredential()`, `resolve()`, `getSafeMetadata()` |
| **Credential Encryption** | `packages/security/src/credential-encryption.ts` | `CredentialEncryption.encrypt()`, `decrypt()` |
| **ClineEngine** | `packages/engine-adapter/src/ClineEngine.ts` | `initialize()`, `startSession()`, `handleClineToolApproval()`, `createGovernedExecutors()` |
| **ClineSession** | `packages/engine-adapter/src/ClineSession.ts` | `waitForCompletion()`, `subscribe()`, `recordAuthorizationToken()` |
| **ToolGateway** | `packages/tool-gateway/src/ToolGateway.ts` | `evaluateAndAuthorizeToolCall()`, `executeTool()`, `validateAuthorizationToken()` |
| **SafetyPolicyPipeline** | `packages/tool-gateway/src/SafetyPolicyPipeline.ts` | `evaluate()` — 7-level precedence pipeline |
| **SafetyEngine** | `packages/safety-engine/src/SafetyEngine.ts` | `analyzeRisk()`, `scanPrompt()`, `scanSecrets()` |
| **KillSwitch** | `packages/safety-engine/src/KillSwitch.ts` | `isContextStopped()`, `isWorkspaceLocked()` |
| **WorkspaceEnforcer** | `packages/tool-gateway/src/WorkspaceEnforcer.ts` | `validatePathAccess()` — Path traversal defense |
| **CapabilityAuthorizer** | `packages/tool-gateway/src/CapabilityAuthorizer.ts` | `checkCapability()` — Agent→Tool authorization |
| **PolicyEngine** | `packages/policy-engine/src/PolicyEngine.ts` | `evaluateCommand()`, `evaluateFileAccess()`, `evaluateNetworkRequest()` |
| **ApprovalEngine** | `packages/approval-engine/src/ApprovalEngine.ts` | `requestApproval()`, `submitDecision()`, `listPending()` |
| **EvidenceStore** | `packages/evidence/src/EvidenceStore.ts` | `storeEvidence()` — SHA-256 hashed evidence |
| **AuditEngine** | `packages/audit-engine/src/AuditEngine.ts` | `logSecurityEvent()` — Tamper-evident audit |
| **EventBus** | `packages/event-bus/src/EventBus.ts` | `publish()`, `subscribe()` — Realtime event streaming |
| **ExecutionGraphEngine** | `packages/control-plane/src/graph/ExecutionGraphEngine.ts` | `replan()`, `updateNodeState()`, `recordObservation()` |

---

## 4. Architecture Invariants Verified

| Invariant | Status | Evidence |
|-----------|--------|----------|
| Cline is sole cognitive engine | ✅ VERIFIED | `ClineEngine.initialize()` creates `ClineCore` — all reasoning through Cline |
| ToolGateway is sole execution boundary | ✅ VERIFIED | `createGovernedExecutors()` wraps all executors through `ToolGateway.executeTool()` |
| No direct executor path exists | ✅ VERIFIED | `governed[toolName]` wrapper requires valid pending token from `handleClineToolApproval()` |
| CR3: No synthetic tenant fallback | ✅ VERIFIED | Empty/missing tenantId → BLOCK in `SafetyPolicyPipeline.evaluate()` |
| CR2: Authorization token binding | ✅ VERIFIED | `generateAuthorizationToken()` binds callId, argumentsHash, tenantId, agentId, sessionId |
| Encrypted credential storage | ✅ VERIFIED | `CredentialEncryption.encrypt()` — AES-256-GCM |
| No plaintext in API responses | ✅ VERIFIED | `getSafeMetadata()` returns `SafeCredentialMetadata` (no secret field) |
| No plaintext in audit/evidence | ✅ VERIFIED | `SecretRedactor.redactObject()` applied before storage |
| Tenant isolation | ✅ VERIFIED | `TenantContext.run()` AsyncLocalStorage + JWT-bound tenantId |
| Path traversal defense | ✅ VERIFIED | `WorkspaceEnforcer.validatePathAccess()` + `SafetyPolicyPipeline` Level 3 |
| Human approval gating | ✅ VERIFIED | `ApprovalEngine.requestApproval()` with timeout and submit/resolution flow |
| Replay prevention | ✅ VERIFIED | `consumeAuthorizationToken()` tracks consumed tokenIds |
| Evidence integrity | ✅ VERIFIED | SHA-256 content hash in `EvidenceStore.storeEvidence()` |

---

## 5. Security Properties

1. **Zero Trust Tenant Model**: Every request must present a valid JWT. The JWT's `tid` claim is the sole source of truth for tenant identity. Headers are never trusted alone.

2. **Fail-Closed Governance**: If the SafetyPolicyPipeline cannot determine safety, the default is BLOCK. If evidence persistence fails for HIGH/CRITICAL risk operations, the result is discarded.

3. **Cryptographic Authorization Tokens**: Every authorized tool call receives an HMAC-SHA256 signed token binding the authorization to the exact callId, argument hash, tenant, agent, session, and timestamp. Tokens are single-use with TTL expiration.

4. **Secret Lifecycle**: Plaintext secrets exist only in memory during `ProviderCredentialResolver.resolve()`. They are never persisted to ClineSession, GraphStore, audit logs, evidence records, EventBus events, or API responses.

5. **Multi-Tenant Isolation**: Credentials, missions, graph state, evidence, and audit records are all scoped by tenantId. Cross-tenant access is blocked at both the middleware and service layers.
