# SYNAPSE-OS — Production Security Boundary Matrix

**Date:** September 1, 2026

---

## Security Boundary Matrix

| Boundary | Caller | Resource | Authorization | Enforcement Layer | Failure Mode |
|----------|--------|----------|---------------|-------------------|--------------|
| **Auth** | Browser/CLI | REST API | JWT signature + expiry + issuer + audience | `authMiddleware` → `JwtService.verify()` | 401 Unauthorized |
| **Auth** | Browser/CLI | REST API | API key hash lookup | `authMiddleware` → `authController.verifyApiKey()` | 401 Unauthorized |
| **Tenant Isolation** | Authenticated User | All Resources | JWT `tid` claim matches request `X-Tenant-Id` | `tenantMiddleware` → Cross-tenant protection | 403 Tenant Mismatch |
| **Workspace Isolation** | Cline Agent | File System | Path must resolve within `workspaceRoot` | `WorkspaceEnforcer.validatePathAccess()` + `SafetyPolicyPipeline` Level 3 | BLOCKED — Path Traversal |
| **Provider Credentials** | Cline Runtime | LLM Provider API | Ownership (userId + orgId) + expiration + revocation | `ProviderCredentialResolver.resolve()` | Returns null |
| **Provider Credentials** | Browser | Credential Metadata | Never receives plaintext | `getSafeMetadata()` → `SafeCredentialMetadata` | Returns keyPrefix only |
| **Cline** | ClineCore | Physical Execution | Authorization token (HMAC-SHA256) | `createGovernedExecutors()` → `ToolGateway.executeTool()` | BLOCKED — No Authorization |
| **MCP** | External Agent | Tool Execution | Same as Cline — through ToolGateway | `SynapseMcpServer` → `ToolGateway.executeTool()` | BLOCKED — No Bypass |
| **ToolGateway** | Cline/MCP | Physical Executor | SafetyPolicyPipeline (7 levels) | `evaluateAndAuthorizeToolCall()` | BLOCK/REQUIRE_APPROVAL/DENIED |
| **ToolGateway** | Cline/MCP | Physical Executor | Single-use HMAC token | `validateAuthorizationToken()` → `consumeAuthorizationToken()` | BLOCKED — Replay/Tamper |
| **Physical Executor** | ToolGateway | File System / Shell / Network | HMAC authorization token | `executeTool()` → token validation | BLOCKED — Invalid Token |
| **PostgreSQL** | Backend | Data Store | Connection string + SSL | Database driver + ORM | Connection refused |
| **FileGraphStore** | Backend | Graph State | File system permissions | OS-level file permissions | Permission denied |
| **WebSocket** | Operator UI | Realtime Events | JWT token in query param | `wsServer.onConnection()` → JWT verify | Connection rejected |
| **Audit/Evidence** | ToolGateway | Tamper-Evident Records | SHA-256 content hash | `EvidenceStore.storeEvidence()` + `AuditEngine.logSecurityEvent()` | Integrity failure |
| **Approval** | Operator | Tool Authorization | Role-based (admin/owner for CRITICAL) | `ApprovalEngine.requestApproval()` + `ApprovalResolver.processDecision()` | Request denied |
| **Kill Switch** | Operator | All Execution | Multi-level (session/context/workspace) | `SafetyEngine.getKillSwitch()` | Execution halted |

---

## Authorization Flow Diagram

```
Browser/CLI
  │
  ├─ [JWT] → authMiddleware → JwtService.verify()
  │                            ├─ Valid signature → Proceed
  │                            └─ Invalid → 401
  │
  ├─ [Tenant] → tenantMiddleware → Cross-tenant check
  │                                 ├─ Match → TenantContext.run()
  │                                 └─ Mismatch → 403
  │
  └─ [Request] → Route Handler → Service Layer
                                   │
                                   ├─ Provider Credentials → ProviderCredentialResolver
                                   │   ├─ Ownership check (userId + orgId)
                                   │   ├─ Expiration check
                                   │   └─ Revocation check
                                   │
                                   ├─ Tool Execution → ToolGateway
                                   │   ├─ SafetyPolicyPipeline (7 levels)
                                   │   │   ├─ Level 0: Tenant context
                                   │   │   ├─ Level 1: Kill switch
                                   │   │   ├─ Level 2: Risk analysis
                                   │   │   ├─ Level 3: Workspace boundary
                                   │   │   ├─ Level 4: Policy engine
                                   │   │   ├─ Level 5: Capability check
                                   │   │   └─ Level 6: Approval requirement
                                   │   ├─ HMAC token generation
                                   │   └─ Token consumption (single-use)
                                   │
                                   └─ Audit/Evidence → SHA-256 hashed, tenant-scoped
```

---

## Critical Invariants

| # | Invariant | Verification | Status |
|---|-----------|-------------|--------|
| 1 | ToolGateway is sole execution boundary | `createGovernedExecutors()` wraps all executors | ✅ VERIFIED |
| 2 | No direct executor path exists | No bypass found in source code | ✅ VERIFIED |
| 3 | JWT signature is HMAC-SHA256 | `JwtService.sign()` uses `crypto.createHmac("sha256", secret)` | ✅ VERIFIED |
| 4 | Tenant isolation is server-side | `tenantMiddleware` + `TenantContext.run()` | ✅ VERIFIED |
| 5 | Provider credentials encrypted at rest | AES-256-GCM via `CredentialEncryption` | ✅ VERIFIED |
| 6 | No plaintext in API responses | `SafeCredentialMetadata` never includes secret | ✅ VERIFIED |
| 7 | HMAC tokens are single-use | `consumeAuthorizationToken()` tracks consumed IDs | ✅ VERIFIED |
| 8 | HMAC tokens have TTL | `expiresAt` field, validated in `validateAuthorizationToken()` | ✅ VERIFIED |
| 9 | Arguments hash-bound to tokens | `computeArgumentsHash()` SHA-256, validated on execution | ✅ VERIFIED |
| 10 | Path traversal blocked | `WorkspaceEnforcer.validatePathAccess()` + `SafetyPolicyPipeline` | ✅ VERIFIED |
| 11 | Dangerous commands blocked | `SafetyEngine.analyzeRisk()` detects CRITICAL patterns | ✅ VERIFIED |
| 12 | Evidence is SHA-256 hashed | `EvidenceHasher.hash()` in `EvidenceStore.storeEvidence()` | ✅ VERIFIED |
| 13 | Audit chain is tamper-evident | `AuditEngine.logSecurityEvent()` with severity classification | ✅ VERIFIED |
| 14 | WebSocket requires authentication | JWT token in query param, verified on connection | ✅ VERIFIED |
| 15 | Multi-tenant EventBus isolation | Events carry `tenantId`, filtered by subscription | ✅ VERIFIED |
