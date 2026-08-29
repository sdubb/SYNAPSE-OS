# SYNAPSE OS — Master Architecture & Implementation Discrepancy Audit

**Audit Baseline Specifications Analyzed:**
- `SYNAPSE OS — COMPLETE FRONTEND IMPL.txt` (Frontend Architecture & UX Spec)
- `SYNAPSE OS.docx` (Backend Architecture & Subsystem Principles)
- `Synapse O1.pdf` / `Synapse O1.docx` (Backend Implementation-Level File Manifest & Engine Integration)
- Active Codebase: `apps/web`, `apps/backend`, `apps/worker`, `apps/realtime`, `packages/*` (24 packages), and `engine/*`

---

## 1. Executive Summary

A comprehensive architectural audit was performed comparing the **Synapse OS reference specifications** (`SYNAPSE OS.docx`, `Synapse O1.pdf`, and `SYNAPSE OS — COMPLETE FRONTEND IMPL.txt`) against the active implementation codebase. 

While the high-level directory structure reflects the intended enterprise layout, the deep audit reveals **critical architectural disconnects, cryptographic vulnerabilities, broken regex compilers, stubbed execution workers, dual WebSocket provider collisions, and silent fallback traps masking backend failures with synthetic demo data**.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       SYNAPSE OS ECOSYSTEM                                       │
├────────────────────────────────┬────────────────────────────────┬────────────────────────────────┤
│       FRONTEND LAYER           │         BACKEND LAYER          │      ENGINE / ADAPTERS         │
│  (apps/web - 151 files)        │ (apps/backend, worker, realtime)│ (packages/* - 24 packages)     │
├────────────────────────────────┼────────────────────────────────┼────────────────────────────────┤
│ ✕ Dual WebSocket Conflict      │ ✕ Controllers use In-Memory    │ ✕ Merkle 2nd-Preimage Vuln     │
│   (Silent no-op event loop)    │   Maps, bypassing Database     │ ✕ 32-bit Polynomial Hash       │
│ ✕ 30+ Endpoints trapped in     │ ✕ Workers use setTimeout       │ ✕ Broken Recursive Glob Regex  │
│   fake fallback mock objects   │   mock loops                   │ ✕ Non-deterministic PRNG      │
│ ✕ Dead Operator controls       │ ✕ Realtime has unauthenticated │ ✕ CIDR matcher stubbed         │
│   (Unconfirmed kill switch)    │   tenant-bleed risk            │ ✕ Cline Engine Bridge Stubbed  │
└────────────────────────────────┴────────────────────────────────┴────────────────────────────────┘
```

---

## 2. Global Architecture Mismatches (Specification vs. Implementation)

### 2.1 Missing Monorepo Applications
* **Specification (`SYNAPSE OS.docx` §2, `Synapse O1.pdf` §1)**:
  - Required apps: `apps/api` (or `apps/backend`), `apps/web` (or `apps/frontend`), `apps/worker`, `apps/realtime`, `apps/verifier`, `apps/simulator`, and `apps/cli`.
* **Current Codebase**:
  - Only `apps/backend`, `apps/realtime`, `apps/web`, and `apps/worker` exist.
  - `verifier` and `simulator` were collapsed into packages (`@synapse/verification-engine`, `@synapse/simulation-engine`) without standalone scalable deployment runtimes.

### 2.2 Cline Engine Execution Boundary Disconnect
* **Specification (`SYNAPSE OS.docx` §0, `Synapse O1.pdf` §0, §2)**:
  - *"Synapse OS is built by forking Cline and embedding Cline's runtime as its native execution engine... Cline is the execution substrate, Synapse governs capability."*
  - `engine/cline` should expose core agent loops, tool abstractions, and LLM providers to `@synapse/engine-adapter`.
* **Current Codebase**:
  - `packages/engine-adapter/src/ClineEngine.ts` contains stubbed execution wrappers that simulate tool invocations rather than binding to the actual `engine/cline/sdk/packages/core` runtime.
  - `apps/worker/src/workers/agent-worker.ts` triggers a 2000ms `setTimeout` and synthesizes fake task results instead of dispatching to the native execution engine.

---

## 3. Backend Engine, Security & Algorithmic Flaws

### 3.1 Cryptographic & Algorithmic Deficiencies

| Subsystem | File & Lines | Defect Description | Impact |
| :--- | :--- | :--- | :--- |
| **Merkle Tree Hasher** | `packages/evidence/src/EvidenceHasher.ts` L49-L79<br>`packages/audit-engine/src/AuditHasher.ts` L60-L105 | **Second-Preimage Collision & Lack of Domain Separation**: Concatenates raw hex strings (`left + right`) without prepending RFC 6962 domain prefixes (`0x00` for leaf, `0x01` for interior). Odd nodes are duplicated naively. | Merkle proofs can be forged by submitting interior node hashes as leaf payloads; trees of different lengths compute duplicate roots. |
| **Canonical JSON Normalizer** | `packages/evidence/src/EvidenceHasher.ts` L30-L46 | **Malformed JSON Generation on `undefined`**: Keys with `undefined` values produce `{"key":undefined}` rather than omitting the property. Special floats (`NaN`, `Infinity`) are not coerced. | Malformed JSON strings break parser verification and produce non-deterministic hashes across runtimes. |
| **Digital Twin Snapshot** | `packages/twin-engine/src/TwinSnapshot.ts` L94-L105 | **Weak 32-bit Polynomial Hash (`Java hashCode` clone)**: State snapshots compute checksums using `(hash << 5) - hash + charCode`. Key order is not canonicalized. | 50% collision probability after ~77k snapshots (Birthday Attack); identical states with differing key insertion order produce divergent hashes. |
| **Policy Glob Compiler** | `packages/policy-engine/src/PolicyCompiler.ts` L257-L270 | **Corrupted Regex Replacement**: Sequential `.replace(/\*\*/g, ".*").replace(/\*/g, "[^/\\]*")` transforms `**` into `.*` and then corrupts `.*` into `.[^/\\]*`. | Deep recursive wildcard matches (e.g., `src/**`) fail completely on nested subdirectories. |
| **CIDR Matcher** | `packages/policy-engine/src/PolicyCompiler.ts` L230-L239 | **Stubbed Subnet Matching**: Only evaluates literal string constants `"RFC1918"`, `"private"`, or `"loopback"`. Arbitrary subnets (`10.50.0.0/16`) return `() => false`. | Granular IP network access rules are ignored and bypassed. |
| **SSRF Host Evaluator** | `packages/policy-engine/src/rules/network.ts` L137-L170 | **Incomplete IP Encoding Normalization**: Does not resolve octal IP addresses (`0177.0.0.1`), hex (`0x7f000001`), or integer notation before evaluation. | Attackers can bypass internal network restrictions via alternate IP representations. |
| **Monte Carlo Simulation** | `packages/simulation-engine/src/MonteCarloRunner.ts` | **Unseeded `Math.random()` PRNG**: Simulation runs rely on JavaScript runtime PRNG rather than a deterministic seeded cryptographic generator (e.g. Xoshiro256**). | Twin simulation results cannot be reproduced or audited. |
| **Safety Risk Scoring** | `packages/safety-engine/src/RiskClassifier.ts` L30-L115 | **Additive Arithmetic Clamping**: Adds raw integers with no normalization or Bayesian weighting. Prompt injection relies solely on regex keywords. | Easily evadable with character obfuscation, zero-width spaces, or base64 framing. |

---

### 3.2 Backend Service & Multi-Tenancy Disconnects

1. **Database Schema Disconnect (`apps/backend/src/controllers/index.ts`)**:
   - `packages/database` defines comprehensive Prisma schemas and migrations.
   - However, `apps/backend` controllers maintain local in-memory JavaScript `Map<string, any>` data structures (`sessionStore`, `taskStore`, `agentStore`, `policyStore`).
   - Server restarts purge all system state, and database persistence is bypassed.

2. **Worker Mock Loops (`apps/worker/src/workers/*`)**:
   - `agent-worker.ts`, `verification-worker.ts`, and `simulation-worker.ts` consume queue jobs and immediately invoke `setTimeout(..., 2000)` to resolve canned JSON fixtures. No actual verification assertions or engine toolchains are executed.

3. **Realtime Multi-Tenant Isolation Gap (`apps/realtime/src/index.ts`)**:
   - WebSocket upgrade handler does not validate authentication tokens or verify tenant boundaries during initial handshake.
   - Any client can subscribe to arbitrary channel patterns (`tenant:*`) and intercept cross-tenant telemetry.

4. **Scheduler Concurrency Deadlocks (`packages/scheduler/src/Scheduler.ts`)**:
   - `Scheduler.tick()` iterates sequentially through due tasks using `await`. A single stalled execution blocks the entire scheduler loop.
   - `InMemoryScheduleLock` lacks automatic TTL expirations, causing permanent task lockouts if a process crashes mid-run.

---

## 4. Frontend Architecture & Implementation Mistakes (`apps/web`)

### 4.1 The Dual WebSocket Provider Severance Bug

* **Files**:
  - `apps/web/src/main.tsx` L27 (Mounts `<WSConnectionProvider>`)
  - `apps/web/src/realtime/WSConnectionProvider.tsx` (Exposes `useRealtime`)
  - `apps/web/src/realtime/WebSocketProvider.tsx` (Exposes `useWebSocket`)
  - `apps/web/src/hooks/useRun.ts` L4
  - `apps/web/src/hooks/useRunEvents.ts` L3
  - `apps/web/src/hooks/useRuns.ts` L4

* **Mechanism of Failure**:
  1. `main.tsx` mounts `<WSConnectionProvider>`.
  2. The primary run hooks (`useRun`, `useRunEvents`, `useRuns`) import `useWebSocket` from `WebSocketProvider.tsx`.
  3. Because `WebSocketProvider` is never rendered in the component tree, `useContext(WebSocketContext)` evaluates to `null`.
  4. `WebSocketProvider.tsx` catches `!context` and returns a dummy object:
     ```ts
     return {
       connected: true,
       status: 'connected',
       subscribe: () => () => {},
       send: () => {},
     };
     ```
  5. **Outcome**: The UI displays green "Connected" status indicators while every real-time subscription is a silent no-op. Real-time agent outputs, step updates, terminal streaming, and live approval prompts never reach the Operator view.

---

### 4.2 Silent Fallback Data Masking in API Clients

* **Files**:
  - `apps/web/src/api/trust-governance-client.ts` L27-L46
  - `apps/web/src/api/client.ts` L488-L516

* **Mechanism of Failure**:
  - `fetchJson` accepts a third parameter `fallbackData`. If any network failure, 404, or 500 error occurs, it returns `fallbackData` instead of throwing an error.
  - Over 30 API methods embed massive static mock dictionaries:
    - `verificationApi.getMetrics()` -> Always returns synthetic 99.4% pass rate.
    - `workspacesApi.getWorkspaces()` -> Always returns 3 mock hardcoded workspaces.
    - `worldApi.getEntities()` -> Always returns synthetic dependency graph nodes.
    - `governanceApi.getPolicies()` -> Always returns 8 hardcoded static policy rules.
    - `systemApi.getTenantSettings()` -> Always returns static dummy enterprise org info.
  - In `client.ts`, mutation calls (`pauseRun`, `resumeRun`, `stopRun`, `sendInstruction`) append `.catch(() => ({ success: true }))`. 
  - **Outcome**: The web application gives the illusion of a working system, completely obscuring disconnected backend endpoints from developers and operators.

---

### 4.3 Interactive Control & Operator Mode Disconnects

* **Specification (`SYNAPSE OS — COMPLETE FRONTEND IMPL.txt` §1, §4, §5)**:
  - Operator page must support real-time human intervention: Tool Approval/Rejection, Clarification Q&A, Dynamic Plan Stepping, and an Emergency Halt kill switch.
* **Codebase Discrepancies**:
  - **Emergency Kill Switch**: `OperatorHeader.tsx` toggles visual state locally without verifying that the backend control plane issued a cryptographically signed halt token.
  - **Tool Approvals**: `ApprovalCard.tsx` executes optimistic local state updates with no rollback on network failure.
  - **Run Tabs (RunsPage)**: Of the 10 specified Run Detail tabs (Overview, Plan, Changes, Terminal, Tests, Logs, Evidence, Twin Diff, Approvals, Timeline), several render static JSON fixtures instead of querying the backend verification and evidence store.

---

## 5. Specification Compliance Matrix

| Specification Item | Reference Document | Required Architecture | Codebase Status | Severity |
| :--- | :--- | :--- | :--- | :--- |
| **Execution Engine Substrate** | `SYNAPSE OS.docx` §0<br>`Synapse O1.pdf` §2 | Native forked Cline runtime in `engine/cline` | Stubbed in `packages/engine-adapter` | 🔴 CRITICAL |
| **Evidence Merkle Hashing** | `Synapse O1.pdf` §10<br>`SYNAPSE OS.docx` §8 | RFC 6962 Domain-separated Merkle Tree with Canonical JSON | Vulnerable to 2nd-preimage collisions; invalid JSON on `undefined` | 🔴 CRITICAL |
| **Realtime Event Bus** | `SYNAPSE OS — COMPLETE FRONTEND IMPL.txt` §1 | Unified WebSocket stream for runs, approvals, and terminal | Severed by dual provider conflict; silent fallback no-ops | 🔴 CRITICAL |
| **Backend Persistence** | `Synapse O1.pdf` §4<br>`SYNAPSE OS.docx` §11 | PostgreSQL via `@synapse/database` Prisma client | Disconnected; controllers use in-memory `Map` | 🔴 CRITICAL |
| **Worker Execution Pipeline** | `Synapse O1.pdf` §1<br>`SYNAPSE OS.docx` §6 | Redis-backed asynchronous verification and agent runs | Mock loops using `setTimeout` | 🔴 CRITICAL |
| **Policy Engine Glob Matching** | `Synapse O1.pdf` §6<br>`SYNAPSE OS.docx` §7 | Fast AST-based recursive directory pattern matching | Corrupted regex compiler breaks `**` matching | 🟠 HIGH |
| **Digital Twin State Integrity** | `Synapse O1.pdf` §14<br>`SYNAPSE OS.docx` §9 | SHA-256 canonical state tree hashing | 32-bit polynomial non-cryptographic checksum | 🟠 HIGH |
| **Operator Human Intervention** | `SYNAPSE OS — COMPLETE FRONTEND IMPL.txt` §5 | Real-time approval, pause/resume, and kill switch | Optimistic mutations with masked API failures | 🟠 HIGH |
| **Error Handling & Fallbacks** | `SYNAPSE OS — COMPLETE FRONTEND IMPL.txt` §1 | Typed error boundaries with user-facing toasts | Masked by 30+ hardcoded fallback mock fixtures | 🟠 HIGH |
| **Tenancy Isolation** | `Synapse O1.pdf` §8<br>`SYNAPSE OS.docx` §10 | Authenticated WebSocket handshake & scoped queries | Unauthenticated realtime connections | 🟠 HIGH |

---

## 6. Systematic Remediation & Production Refactoring Plan

### Phase 1: Cryptographic & Algorithmic Hardening
1. **Fix `EvidenceHasher` & `AuditHasher`**:
   - Implement RFC 6962 domain prefixes (`0x00` for leaf nodes, `0x01` for interior nodes).
   - Use raw binary byte hashing (`Buffer.concat`) instead of hex string concatenation.
   - Enforce sorted key recursive serialization with strict omission of `undefined` keys.
2. **Upgrade `TwinSnapshot`**:
   - Replace 32-bit polynomial hashing with canonical SHA-256 state hashing.
3. **Fix `PolicyCompiler`**:
   - Refactor `compileGlobMatcher` to replace `**` with a unique sentinel token before translating `*` and `?`, restoring recursive path matching.
   - Implement full CIDR bitmask evaluation for arbitrary subnets.

### Phase 2: Realtime & API Client Unification
1. **Eliminate WebSocket Split**:
   - Delete `apps/web/src/realtime/WebSocketProvider.tsx`.
   - Update `useRun`, `useRuns`, and `useRunEvents` to consume `useRealtime` from `WSConnectionProvider.tsx`.
2. **Purge Synthetic Mock Traps**:
   - Remove `fallbackData` arguments from `fetchJson` in `trust-governance-client.ts`.
   - Remove `.catch(() => ({ success: true }))` swallows in `client.ts` to allow React Query error boundaries to trigger.

### Phase 3: Backend Controller & Worker Integration
1. **Bind Controllers to Database**:
   - Replace all `Map` instances in `apps/backend/src/controllers/index.ts` with Prisma client methods from `@synapse/database`.
2. **Connect Workers to Engine Substrate**:
   - Wire `apps/worker` to execute real test assertions and dispatch tasks to `@synapse/engine-adapter`.
3. **Harden Realtime Authentication**:
   - Enforce JWT extraction and tenant context validation during WebSocket handshake in `apps/realtime`.
