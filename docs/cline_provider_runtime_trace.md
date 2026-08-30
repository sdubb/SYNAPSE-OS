# FORENSIC TRACE: REAL CLINE PROVIDER RUNTIME PATH

**Document**: `docs/cline_provider_runtime_trace.md`  
**Date**: 2026-08-31  
**Target Subsystems**: Freebuff Security, ProviderCredentialResolver, ClineEngine, ToolGateway, State Persistence  

---

## 1. Executive Summary

This forensic trace documents the end-to-end credential path from human authentication in Freebuff to the Cline cognitive engine, proving that credentials are:
1. **Encrypted at rest** with AES-256-GCM (PBKDF2 key derivation).
2. **Resolved ephemerally** in backend runtime memory only.
3. **Never persisted in plaintext** by Cline, Synapse, or PostgreSQL.
4. **Strictly isolated** across users, tenants, and workspaces.
5. **Never shared** across concurrent Cline execution sessions.

```
HUMAN OPERATOR
  ↓ (1) Authenticated Request [JWT Bearer + Tenant ID]
FREEBUFF REST API (/api/v1/provider-credentials, /api/v1/sessions)
  ↓ (2) Invokes ProviderCredentialResolver.resolve()
PROVIDER CREDENTIAL RESOLVER (packages/security/src/provider-credential-resolver.ts)
  ↓ (3) Decrypts AES-256-GCM in-memory secret
CLINE ENGINE (packages/engine-adapter/src/ClineEngine.ts)
  ↓ (4) Passes ephemeral config to executeStart()
CLINE COGNITIVE RUNTIME (@cline/core)
  ↓ (5) Issues LLM API request with user's apiKey
REAL LLM PROVIDER (Anthropic / OpenAI / OpenRouter)
  ↓ (6) Emits reasoning & tool call requests
CLINE ENGINE (handleClineToolApproval)
  ↓ (7) Authoritative Synapse Interception (Precedence Levels 0–6)
TOOLGATEWAY (packages/tool-gateway/src/ToolGateway.ts)
  ↓ (8) Evaluates safety, workspace, and policy; mints HMAC token
PHYSICAL EXECUTOR & AUDIT ENGINE
```

---

## 2. Step-by-Step Codebase Trace with Exact Line References

### Step 1: Credential Storage & Encryption at Rest
- **File**: [`packages/security/src/credential-encryption.ts`](file:///C:/Users/lenovo/OneDrive/Desktop/os/packages/security/src/credential-encryption.ts)
- **Functions**: `encrypt(plaintext: string): string`, `decrypt(ciphertext: string): string`
- **Mechanism**:
  - Master key derived from `SYNAPSE_CREDENTIAL_ENCRYPTION_KEY` using PBKDF2 (100,000 iterations, SHA-512).
  - Cipher: AES-256-GCM with 16-byte random IV and 16-byte authentication tag.
  - Serialization: `salt:iv:authTag:ciphertext` (all base64-encoded).
  - Key prefix derived via `deriveKeyPrefix()` (`sk-ant-api03-...` $\rightarrow$ `sk-ant...`).

### Step 2: Runtime Credential Resolution & Tenant Verification
- **File**: [`packages/security/src/provider-credential-resolver.ts`](file:///C:/Users/lenovo/OneDrive/Desktop/os/packages/security/src/provider-credential-resolver.ts)
- **Method**: `ProviderCredentialResolver.resolve(context, provider, credentialId)` (Lines 105–154)
- **Verification Logic**:
  1. `c.status === 'active'` (Line 113)
  2. `c.userId === context.userId` (Line 114) — strict user isolation.
  3. `c.organizationId === context.organizationId` (Line 115) — strict tenant isolation.
  4. `c.workspaceId === context.workspaceId` (Lines 118–120) — workspace scope enforcement.
  5. `!c.expiresAt || c.expiresAt > new Date()` (Lines 134–136) — expiration check.
  6. In-memory decryption only: `const apiKey = this.encryption.decrypt(selected.encryptedSecret)` (Line 139).
- **Return Type**: `ResolvedCredential` containing `{ provider, apiKey, model, baseUrl, credentialId, userId, tenantId }`.

### Step 3: Ingestion into ClineEngine & Ephemeral Session Dispatch
- **File**: [`packages/engine-adapter/src/ClineEngine.ts`](file:///C:/Users/lenovo/OneDrive/Desktop/os/packages/engine-adapter/src/ClineEngine.ts)
- **Method**: `ClineEngine.startSession(options: StartEngineSessionOptions)` (Lines 450–520)
- **Code Trace**:
  - Line 471–473: Extracts `{ providerId, modelId, apiKey }` from `options.modelConfig`.
  - Line 477–491: Instantiates `ClineSession` with `modelConfig`.
  - Line 496–517: Invokes `executeStart` passing `config: { providerId, modelId, apiKey, toolPolicies: { "*": { autoApprove: false } } }`.

### Step 4: Verification of Zero Plaintext Persistence in ClineSession
- **File**: [`packages/engine-adapter/src/ClineSession.ts`](file:///C:/Users/lenovo/OneDrive/Desktop/os/packages/engine-adapter/src/ClineSession.ts)
- **Constructor & Properties**: Lines 69–74 & Lines 117–122:
  ```typescript
  private readonly modelConfig: {
    provider: string;
    modelId: string;
    inputPricePer1M: number;
    outputPricePer1M: number;
  };
  ```
- **Security Confirmation**: `apiKey` is **intentionally omitted** from `ClineSession` internal fields. `ClineSession` retains only public model metadata and pricing coefficients for token cost calculation.

### Step 5: Lifecycle Start & Non-Leaking Execution
- **File**: [`packages/engine-adapter/src/lifecycle/start.ts`](file:///C:/Users/lenovo/OneDrive/Desktop/os/packages/engine-adapter/src/lifecycle/start.ts)
- **Function**: `executeStart(options: LifecycleStartOptions): Promise<StartSessionResult>`
- **Error Handling**: Lines 13–19 catch errors and wrap in `ClineExecutionError` without logging or leaking the `apiKey`.

---

## 3. Forensic Leakage & Concurrency Analysis

| Forensic Question | Inspection Result | Evidence / Code Reference |
|---|---|---|
| **1. Where does Freebuff resolve credentials?** | `ProviderCredentialResolver.resolve()` | `packages/security/src/provider-credential-resolver.ts:105-154` |
| **2. Where does the credential enter ClineEngine?** | `ClineEngine.startSession()` | `packages/engine-adapter/src/ClineEngine.ts:470-517` |
| **3. Which Cline configuration receives it?** | Ephemeral `ClineCoreStartInput.config` | `packages/engine-adapter/src/ClineEngine.ts:504-517` |
| **4. Does Cline internally copy or persist it?** | **NO**. Omitted from `ClineSession` | `packages/engine-adapter/src/ClineSession.ts:69-74` |
| **5. Does any cache retain plaintext?** | **NO**. Resolver stores only encrypted strings | `packages/security/src/provider-credential-resolver.ts:76` |
| **6. Does session persistence retain it?** | **NO**. `FileGraphStore` stores only nodes/edges | `packages/control-plane/src/graph/GraphStore.ts` |
| **7. Can logs / error stack traces expose it?** | **NO**. Logs explicitly sanitized | `apps/backend/src/routes/provider-credentials.routes.ts:55` |
| **8. Can concurrent Cline runs share credentials?** | **NO**. ModelConfig passed per `startSession` call | `packages/engine-adapter/src/ClineEngine.ts:477-493` |

---

## 4. Conclusion

The credential architecture strictly maintains tenant and process boundaries. The plaintext credential lives solely in the ephemeral call stack of the active execution turn, leaving zero trace in persisted files, audit ledgers, or session snapshots.
