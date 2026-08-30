# SYNAPSE-OS — REAL BACKEND FAILURE INJECTION MATRIX

This matrix records the systematic injection of real runtime faults, corruptions, and edge-case attacks across the SYNAPSE-OS execution substrate, verifying strict **Fail-Closed** security and operational integrity.

---

## Failure Injection Scenarios & Observed System Responses

| # | Fault / Attack Injected | Subsystem Targeted | Injected Payload / Condition | Expected Behavior | Actual Observed Outcome | Verdict |
|---|---|---|---|---|---|---|
| **1** | **Unregistered / Non-Existent Tool Call** | `CapabilityAuthorizer` / `ToolGateway` | Invocation of `non_existent_unregistered_tool` with restricted caller capabilities | Authorization rejected (`BLOCK`) | Tool invocation rejected with `authorized: false` | **FAIL-CLOSED** |
| **2** | **Foreign Key Constraint Violation** | Relational Database Layer (`DatabaseClient`) | Insert into `orders` referencing non-existent `customer_id: "cust_NONEXISTENT"` | SQLite / PostgreSQL foreign key exception thrown | Transaction rejected with foreign key constraint error | **FAIL-CLOSED** |
| **3** | **Unique Constraint Collision** | Relational Database Layer | Insert duplicate email into `customers` | Unique index violation exception | Write rejected, table row count unmodified | **FAIL-CLOSED** |
| **4** | **Uncommitted Transaction Failure** | Relational Database Transaction Manager | Exception thrown midway through multi-statement transaction | Complete rollback to pre-transaction state | Rollback verified, 0 phantom records created | **FAIL-CLOSED** |
| **5** | **Destructive Command Injection** | `PolicyEngine` / `SafetyEngine` | Execution of `rm -rf / --no-preserve-root` | Precedence Level 2 / Level 4 policy block | Pipeline evaluation returned `decision: "BLOCK"`, score: 100 | **FAIL-CLOSED** |
| **6** | **Forged HMAC Token Signature** | `ToolGateway.executeTool` | Mutation of token `signature` to random hex string | Cryptographic verification rejection | Execution aborted with `signature verification failed` | **FAIL-CLOSED** |
| **7** | **Expired Authorization Token** | `ToolGateway.executeTool` | Setting token `expiresAt = Date.now() - 5000` | Expiration check rejection | Execution aborted with `Authorization token has expired` | **FAIL-CLOSED** |
| **8** | **Tool Parameter Mutation Post-Approval** | `ToolGateway.executeTool` | Changing tool argument `path` from `config.json` to `/etc/shadow` | SHA-256 argument hash mismatch detection | Execution aborted with `argument hash mismatch` | **FAIL-CLOSED** |
| **9** | **Authorization Token Replay Attack** | `ToolGateway.executeTool` | Attempting a second execution with an already-consumed token ID | Consumed token map rejection | Second execution aborted with `token has already been consumed` | **FAIL-CLOSED** |
| **10** | **Cross-Tenant File Workspace Escape** | `SafetyPolicyPipeline` Level 0 | Tenant A attempting to access Tenant B directory | Precedence Level 0 boundary block | Blocked with `Strict tenant isolation violation` | **FAIL-CLOSED** |
| **11** | **Emergency Kill Switch Level 2 Engagement** | `KillSwitch` | `triggerLevel2(sessionId)` during active session | Immediate session halt | All subsequent tool requests blocked | **FAIL-CLOSED** |
| **12** | **Emergency Kill Switch Level 3 Workspace Lock** | `KillSwitch` | `lockWorkspace(workspaceRoot)` | Level 3 workspace lock engagement | All tool calls targeting workspace rejected | **FAIL-CLOSED** |
| **13** | **Human Approval Timeout (Default-Deny)** | `ApprovalEngine` / `ApprovalTimeoutMonitor` | Request requiring operator approval with 1s timeout | Expiration without operator input | Resolves as `timed_out` (Fail-Closed Default-Deny) | **FAIL-CLOSED** |
| **14** | **Optimistic Concurrency Collision (OCC Replan)** | `ExecutionGraphEngine.replan` | Submitting two concurrent replans with stale `baseVersion: 1` | Second replan rejected under OCC | Throws `Concurrency Conflict: Attempted to replan based on version 1, but active is 2` | **FAIL-CLOSED** |
| **15** | **AI Claim Spoofing vs Authoritative Facts** | `ConditionEvaluator` / Context Store | AI injecting `AGENT_CLAIM` claiming `true` when observation is `false` | Fact priority over unverified claims | Condition `database.compatible == false` remains `true` | **FAIL-CLOSED** |
| **16** | **Worker Crash During Leased Job Processing** | `DurableJobQueue` | Worker reserving job with 1s visibility timeout and crashing | Lease expires, job automatically re-queued | Job successfully reserved by recovered worker | **FAIL-CLOSED** |
| **17** | **Duplicate Job Enqueue Idempotency Attack** | `DurableJobQueue` | Submitting identical job with duplicate `idempotencyKey` | Idempotency deduplication | Duplicate enqueue ignored, returns existing job | **FAIL-CLOSED** |
| **18** | **Process Crash & Engine State Restoration** | `ExecutionGraphEngine.loadFromStore` | Process killed after V2 replan and observation | Durable disk reconstruction without duplicate records | Graph V2 restored with exact observation history | **FAIL-CLOSED** |

---

## Summary of Integrity Guarantees

- **No Silent Successes:** Zero unhandled errors were swallowed.
- **No Synthetic Bypasses:** All requests routed through real security boundaries.
- **No Leaked State:** Transient database, simulation, and kill switch drills left zero persistent corruption.
