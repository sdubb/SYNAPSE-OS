# SYNAPSE-OS — Production Deployment Runbook

**Date:** September 1, 2026  
**Status:** Production Readiness Assessment

---

## 1. Infrastructure Requirements

### Required Services

| Service | Port | Purpose | Required |
|---------|------|---------|----------|
| PostgreSQL | 5432 | Primary data store | YES |
| Redis | 6379 | Session cache, rate limiting, pub/sub | YES |
| Node.js Backend | 3000 | REST API + middleware | YES |
| WebSocket Server | 3001 | Realtime event streaming | YES |
| MCP Server | 3595 | Streamable HTTP MCP endpoint | OPTIONAL |
| Operator Frontend | 5173 (dev) / 80 (prod) | React UI | YES |

### Environment Variables (MUST set for production — FAIL-CLOSED)

The application will **refuse to start** if any required variable is missing.
No default secrets, no wildcard CORS, no silent development fallbacks.

```bash
# CRITICAL — Application will CRASH on startup if not set
NODE_ENV=production
SYNAPSE_JWT_SECRET=<random-64-char-hex-string>           # ≥32 chars, JWT signing
SYNAPSE_CREDENTIAL_ENCRYPTION_KEY=<random-64-char-hex>   # ≥32 chars, AES-256-GCM master
SYNAPSE_BEACON_SECRET=<random-64-char-hex-string>         # ≥32 chars, beacon signatures

# REQUIRED — Database (no default URL)
DATABASE_URL=postgresql://synapse:<password>@<host>:5432/synapse_os
REDIS_URL=redis://<host>:6379

# REQUIRED — CORS (no wildcard allowed)
CORS_ORIGIN=https://your-domain.com,https://admin.your-domain.com

# OPTIONAL — Provider Keys
OPENROUTER_API_KEY=sk-or-v1-...

# OPTIONAL — Security Beacon
SYNAPSE_SECURITY_BEACON_URL=https://your-beacon-endpoint.com/report
```

### Persistent Volumes

| Path | Purpose |
|------|---------|
| `/data/synapse/graphs` | FileGraphStore graph state |
| `/data/synapse/evidence` | Evidence records |
| `/data/synapse/audit` | Audit chain |
| `/data/synapse/workspaces` | Tenant workspace directories |
| `/data/synapse/logs` | Application and security logs |

---

## 2. Startup Order

```
1. PostgreSQL
   └─ Wait for: pg_isready -h localhost -p 5432

2. Redis
   └─ Wait for: redis-cli ping → PONG

3. Persistent Storage
   └─ Verify: /data/synapse/ exists and is writable

4. Synapse Backend (Node.js)
   └─ Command: NODE_ENV=production node dist/main.js
   └─ Wait for: curl http://localhost:3000/health → 200

5. WebSocket Fabric
   └─ Command: Integrated with backend (same process)
   └─ Wait for: ws://localhost:3001 connects

6. Cline Runtime
   └─ Initialized by ClineEngine.initialize() on backend start
   └─ Wait for: /health reports ClineEngine status: HEALTHY

7. Operator Frontend
   └─ Command: serve dist/ on port 80
   └─ Verify: https://your-domain.com loads
```

---

## 3. Health Checks

### Backend Health
```bash
GET /health
Response: { "status": "ok", "services": { "database": "up", "redis": "up", "cline": "healthy" } }
```

### Critical Subsystem Checks

| Subsystem | Check | Expected |
|-----------|-------|----------|
| Database | `SELECT 1` | Row returned |
| Redis | `PING` | PONG |
| ClineEngine | `getHealth()` | status: HEALTHY |
| EventBus | `getStats()` | subscribersCount > 0 |
| ToolGateway | `evaluateAndAuthorizeToolCall()` | Returns authorization result |
| ApprovalEngine | `listPending()` | Returns array |
| Rate Limiter | Process memory | < 500MB heap |

---

## 4. Graceful Shutdown

```
SIGTERM received
  → Stop accepting new HTTP connections
  → Drain in-flight requests (30s timeout)
  → ClineEngine.dispose() — abort active sessions
  → ApprovalEngine.shutdown() — stop timeout monitor
  → EventBus.stop() — disconnect subscribers
  → Close database connections
  → Close Redis connections
  → Flush audit logs
  → Exit 0
```

---

## 5. Recovery Behavior

### Backend Crash
- PostgreSQL retains all data (ACID transactions)
- On restart: ClineEngine reinitializes, active sessions are lost
- Graph state recovered from FileGraphStore
- Audit chain remains valid
- **Action**: Restart backend, verify `/health` returns OK

### WebSocket Crash
- Clients detect disconnect, initiate reconnect
- On reconnect: Server reconstructs state from authoritative storage
- No duplicate events (EventBus deduplication)
- **Action**: WebSocket server restarts with backend

### Cline Crash
- ClineEngine.dispose() cleans up active sessions
- Mission state preserved in graph (last known state)
- **Action**: Restart backend, missions in RUNNING state marked as FAILED

### Database Restart
- Backend loses connection, retries with exponential backoff
- On reconnect: All data intact from last committed transaction
- **Action**: Restart PostgreSQL, verify backend reconnects

### Host Restart
- All in-memory state lost (users, sessions, API keys)
- Database, FileGraphStore, evidence preserved
- **Action**: Full startup sequence per Section 2

---

## 6. Production Security Checklist

### Before Deployment
- [ ] `NODE_ENV=production` is set
- [ ] `SYNAPSE_JWT_SECRET` is set to a random 64+ char string
- [ ] `SYNAPSE_MASTER_KEY` is set to a random 64+ char string
- [ ] `SYNAPSE_CREDENTIAL_ENCRYPTION_KEY` is set
- [ ] `DATABASE_URL` points to production PostgreSQL with strong password
- [ ] `REDIS_URL` points to production Redis with authentication
- [ ] `CORS_ORIGIN` is set to your exact domain(s)
- [ ] Default admin user (`usr_admin_01`) is removed or password-protected
- [ ] Default tenant fallback is disabled or scoped
- [ ] HTTPS enforced via reverse proxy (nginx/cloudflare)
- [ ] Rate limiting configured for production thresholds
- [ ] Database backups enabled (pg_dump cron or managed service)
- [ ] Log aggregation configured
- [ ] Monitoring/alerting configured

### Runtime Security
- [ ] All API endpoints require authentication (except /health)
- [ ] JWT tokens verified with production secret
- [ ] Tenant isolation enforced server-side
- [ ] Provider credentials encrypted at rest
- [ ] No plaintext secrets in logs, audit, or events
- [ ] ToolGateway governs all physical execution
- [ ] HMAC authorization tokens single-use with TTL
- [ ] Path traversal blocked by WorkspaceEnforcer
- [ ] Dangerous commands blocked by SafetyEngine

---

## 7. Backup & Restore

### PostgreSQL Backup
```bash
# Daily backup
pg_dump -h localhost -U synapse synapse_os > backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U synapse synapse_os < backup_20260901.sql
```

### FileGraphStore Backup
```bash
# Copy graph directory
cp -r /data/synapse/graphs /backup/synapse/graphs_$(date +%Y%m%d)
```

### Encryption Key Backup
- Store `SYNAPSE_MASTER_KEY` and `SYNAPSE_JWT_SECRET` in a secrets manager (Vault, AWS Secrets Manager, etc.)
- **NEVER** commit to Git
- **NEVER** store in plaintext on disk

### Restore Verification
After restore, verify:
1. `GET /health` returns 200
2. Graph state is consistent (node counts match)
3. Evidence records are intact (SHA-256 hashes match)
4. Audit chain is unbroken
5. Provider credentials decrypt correctly

---

## 8. Incident Response

### Provider Credential Compromised
1. Immediately revoke the credential via `POST /provider-credentials/:id/revoke`
2. Rotate to new credential
3. Audit all recent tool executions for the affected tenant
4. Check evidence records for unauthorized operations
5. Notify affected users

### JWT Secret Compromised
1. Generate new random JWT secret
2. Deploy with new `SYNAPSE_JWT_SECRET`
3. All existing tokens are immediately invalidated
4. Users must re-authenticate
5. Audit recent auth events

### Tenant Isolation Defect Discovered
1. **STOP** — Do not continue normal operations
2. Capture forensic evidence (audit logs, evidence records)
3. Assess blast radius (which tenants/data were exposed)
4. Patch the isolation boundary
5. Add regression test
6. Full regression suite verification
7. Notify affected tenants

### ToolGateway Bypass Discovered
1. **STOP** — Critical security incident
2. Capture the bypass vector
3. Add blocking rule to SafetyPolicyPipeline
4. Add regression test
5. Full regression suite verification
6. Review all recent executions for exploitation

### Database Corruption
1. Stop backend immediately
2. Take database snapshot before any repair
3. Restore from last known-good backup
4. Replay WAL logs if possible
5. Verify graph state and evidence integrity
6. Resume operations

### Cline Becomes Unresponsive
1. ClineEngine.dispose() to clean up
2. Restart backend
3. Mark affected missions as FAILED
4. Check ClineCore logs for root cause
5. Resume missions from last checkpoint
