# Identity, Authentication & Multi-Tenancy — Forensic Audit

> Audit date: 2026-08-30

## Executive Summary

SYNAPSE has a solid auth middleware foundation (JWT, tenant isolation, RBAC, AsyncLocalStorage context) but the actual user authentication is **fake** — the login endpoint always returns `usr_admin_01` with admin privileges. The frontend auto-logs in as this hardcoded user. There is no real user management, no organization/workspace model, no membership system, and no API key management.

Cline's authentication mechanisms are all **cognitive/provider infrastructure** — they must be preserved.

---

## Mechanism Classification

### SYNAPSE Backend Auth (Product Auth)

| Mechanism | Location | Classification | Status |
|---|---|---|---|
| JWT auth middleware | `apps/backend/src/middleware/auth.ts` | Product auth | **IMPLEMENTED** — HMAC-SHA256 JWT, Bearer token, API key |
| Dev token bypass | `auth.ts` line 34-40 | Dev shortcut | **UNSAFE** — `dev_token`/`mock-jwt-token` bypass all crypto |
| API key auth | `auth.ts` line 64-76 | Product auth | **PARTIAL** — hardcoded internal key, no DB lookup |
| Dev fallback | `auth.ts` line 82-90 | Dev shortcut | **UNSAFE** — any request with X-Tenant-Id passes in dev |
| Tenant middleware | `apps/backend/src/middleware/tenant.ts` | Tenant isolation | **IMPLEMENTED** — cross-tenant protection, AsyncLocalStorage |
| Permissions middleware | `apps/backend/src/middleware/permissions.ts` | Authorization | **IMPLEMENTED** — `requirePermission()` function |
| RBAC service | `packages/security/src/authorization/rbac.ts` | Authorization | **IMPLEMENTED** — 7 roles, 30+ permissions |
| Login endpoint | `apps/backend/src/controllers/index.ts:135` | Product auth | **FAKE** — always returns admin user, no DB lookup |
| `/auth/me` endpoint | `apps/backend/src/routes/auth.routes.ts:17` | Product auth | **PARTIAL** — returns `req.user` from JWT, no DB fetch |
| Frontend auth state | `apps/web/src/state/auth.tsx` | Product auth | **FAKE** — auto-login as hardcoded admin |

### Database Schemas (Product Infrastructure)

| Schema | Location | Status |
|---|---|---|
| `tenants` | `packages/database/src/schemas/tenants.ts` | **IMPLEMENTED** — name, slug, quotas, settings |
| `users` | `packages/database/src/schemas/users.ts` | **IMPLEMENTED** — email, role, permissions, tenant FK |
| `agents` | `packages/database/src/schemas/agents.ts` | **IMPLEMENTED** — tenant FK, name, model, capabilities |
| `sessions` | `packages/database/src/schemas/sessions.ts` | **IMPLEMENTED** — tenant FK, agent FK, status, tokens |
| `memberships` | — | **MISSING** — no org membership table |
| `organizations` | — | **MISSING** — only tenants exist, no org concept |
| `workspaces` | — | **MISSING** — workspace is a UUID field, no table |
| `api_keys` | — | **MISSING** — no API key management |
| `user_sessions` | — | **MISSING** — no session management |

### Cline Auth (Cognitive/Provider Infrastructure — PRESERVE)

| Mechanism | Location | Classification | Action |
|---|---|---|---|
| Cline AuthService (WorkOS) | `engine/cline/apps/vscode/src/sdk/auth-service.ts` | Cline Cloud auth | **PRESERVE** — needed for Cline Cloud features |
| ClineAccountService | `engine/cline/sdk/packages/core/src/account/cline-account-service.ts` | Cline account management | **PRESERVE** — needed for Cline features |
| MCP OAuth | `engine/cline/apps/vscode/src/services/mcp/` | MCP server auth | **PRESERVE** — needed for MCP connections |
| OpenAI Codex OAuth | `engine/cline/sdk/packages/core/src/auth/codex.ts` | Provider auth | **PRESERVE** — needed for model access |
| OpenRouter auth | `engine/cline/apps/vscode/src/core/controller/account/openrouterAuthClicked.ts` | Provider auth | **PRESERVE** — needed for model access |
| Provider API keys | `engine/cline/apps/vscode/src/` | Provider credentials | **PRESERVE** — needed for model access |
| OCA Auth | `engine/cline/apps/vscode/src/services/auth/oca/` | Provider auth | **PRESERVE** — needed for model access |

---

## Architectural Invariant

```
HUMAN → AUTHENTICATES → SYNAPSE → AUTHORIZES → CLINE THINKS → SYNAPSE GOVERNS → TOOLGATEWAY EXECUTES
```

- SYNAPSE is the authoritative human identity and authorization layer
- Cline auth mechanisms remain for cognitive/provider functionality
- No Cline auth mechanism should act as SYNAPSE product authentication

---

## What Needs Implementation

1. **Real login** — user lookup by email, password verification, JWT issuance
2. **User registration** — signup with email, create default org
3. **Organization model** — orgs own workspaces, missions, agents
4. **Workspace model** — workspaces within orgs
5. **Membership model** — user ↔ org with role
6. **Current-user endpoint** — fetch real user data from DB
7. **Session management** — multiple sessions, revoke
8. **API key management** — create, revoke, scope
9. **Frontend auth flow** — login page, signup, session restore
10. **Org/workspace switchers** — UI to switch context
11. **Remove dev shortcuts** — `dev_token`, `mock-jwt-token`, dev fallback

---

## Security Findings

| Finding | Severity | Status |
|---|---|---|
| `dev_token` bypasses all JWT verification | CRITICAL | Must remove in production |
| `mock-jwt-token` bypasses all JWT verification | CRITICAL | Must remove in production |
| Dev fallback allows any request with X-Tenant-Id | HIGH | Must remove in production |
| API key auth doesn't verify against DB | HIGH | Must implement DB lookup |
| Login always returns admin user | HIGH | Must implement real auth |
| No password hashing | MEDIUM | Must implement bcrypt/argon2 |
| No session expiration tracking | MEDIUM | Must implement |
| Frontend hardcodes user profile | HIGH | Must fetch from backend |
