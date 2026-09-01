# SYNAPSE-OS — CLINE RUNTIME FAILURE & RECOVERY MATRIX

**Document**: `docs/cline_runtime_failure_matrix.md`  
**Date**: 2026-09-01  
**Milestone**: Hostile Failure Injection & Deterministic Recovery Verification  

---

## 1. Overview

This matrix details the behavior of the **Cline Primary Cognitive Brain** and **Synapse OS** under various hostile real-world failure conditions, verifying fail-closed security, state persistence, and deterministic recovery.

---

## 2. Failure Scenarios & Recovery Responses

| Failure Mode | Point of Failure | System Reaction | Recovery Protocol | State After Recovery |
|---|---|---|---|---|
| **Hard Process Termination** | Cline runtime process killed via `SIGKILL` | Synapse detects disconnected process; transitions active node from `RUNNING` to `FAILED`. | Cold restart rehydrates graph from `FileGraphStore`/PostgreSQL; requires operator or Cline replan. | `FAILED` / `RECOVERY_REQUIRED` |
| **Provider Network Timeout** | LLM API request times out (>30s) | In-memory retry with exponential backoff (up to 3 attempts); if exhausted, marks node as `FAILED`. | Cline generates fallback execution branch or operator intervenes. | `FAILED` (Honest diagnostic message) |
| **Malformed Tool Arguments** | Cline emits invalid JSON or incorrect schema | ToolGateway schema validator rejects call at Precedence Level 5. | Rejection reason returned to Cline in observation prompt to trigger self-correction. | `RUNNING` (Self-correcting) |
| **Path Traversal Attack** | Tool attempts access outside tenant sandbox | ToolGateway Precedence Level 3 intercepts and blocks execution. | Security policy alert logged; node marked as `BLOCKED`; incident recorded in audit ledger. | `BLOCKED` (Fail-closed) |
| **Emergency Kill-Switch** | Human operator triggers Level 1–3 stop | ToolGateway Precedence Level 1 immediately rejects all subsequent tool executions. | All active sessions aborted; restart requires authorized reset. | `HALTED` / `ABORTED` |
| **Approval Timeout** | High-risk tool waits >15m without human decision | `ApprovalTimeoutMonitor` transitions request to `timed_out`. | Resolution returned as `REJECTED`; tool execution blocked; replan suggested. | `REJECTED` (Fail-closed) |
| **OCC Graph Version Conflict** | Cline replans based on outdated version | `ExecutionGraphEngine.replan()` throws `Concurrency Conflict`. | Cline queries latest graph state and re-submits plan with updated `baseVersion`. | `VERSION_UPDATED` |
| **WebSocket Client Disconnect** | Operator browser disconnects during active mission | Backend continues governed execution; events buffered in PostgreSQL. | Operator reconnects; pulls full rehydrated mission state and logs. | `SYNCHRONIZED` |

---

## 3. Invariant Guarantee

Under no condition does a failure cause **unauthorized tool execution**, **plaintext credential leakage**, or **corrupted audit ledger sequences**.
