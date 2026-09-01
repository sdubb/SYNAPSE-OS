# SYNAPSE-OS — SECURITY BOUNDARY VERIFICATION MATRIX

**Document**: `docs/security_boundary_matrix.md`  
**Date**: 2026-09-01  
**Milestone**: Multi-Tenant & Subsystem Boundary Defense Verification  

---

## 1. Overview

This matrix defines the authoritative security boundaries across all SYNAPSE-OS surfaces: **REST APIs**, **WebSockets**, **MCP Transports**, **Database Layers**, and **Credential Stores**.

---

## 2. Boundary Verification Matrix

| Surface | Authority | Enforcement Mechanism | Failure Policy | Audit Record |
|---|---|---|---|---|
| **Authentication & RBAC** | Synapse Auth | JWT Bearer verification + Tenant/Workspace claim validation | Fail-Closed (`HTTP 401 / 403`) | `auth.session.created`, `auth.failed` |
| **Provider Credentials** | ProviderCredentialResolver | AES-256-GCM encryption at rest; ephemeral in-memory decryption per turn | Fail-Closed (`null` resolution) | `credential.stored`, `credential.rotated` |
| **Tool Execution** | ToolGateway | Precedence Levels 0–6 safety policy pipeline + HMAC authorization tokens | Fail-Closed (`BLOCK`) | `tool.authorized`, `tool.executed` |
| **Human Approvals** | ApprovalEngine | Multi-party quorum verification + role checks + expiration timer | Fail-Closed (`REJECTED`) | `approval.requested`, `approval.granted` |
| **Filesystem Sandbox** | WorkspaceEnforcer | Strict path normalization within `workspaceRoot` | Fail-Closed (`BLOCK`) | `sandbox.violation` |
| **External MCP Clients** | SynapseMcpTransport | Subordinate worker boundary; 13 tools pass through ToolGateway | Fail-Closed (`UNAUTHORIZED`) | `mcp.tool.executed` |
| **Emergency Kill Switch** | KillSwitch | Global, tenant, runtime, or session-level execution halt | Fail-Closed (`KILL_SWITCH`) | `kill.level1`, `kill.level2`, `kill.level3` |

---

## 3. Precedence Hierarchy

```text
Precedence Level 0: Multi-Tenant & Workspace Root Validation
Precedence Level 1: System & Tenant Kill-Switch Check
Precedence Level 2: Human Approval Engine Gating
Precedence Level 3: Filesystem & Tool Sandbox Containment
Precedence Level 4: Static & Dynamic Security Policy Rules
Precedence Level 5: Argument Schema & JSON Validation
Precedence Level 6: Cryptographic HMAC Token Minting & Execution
```
