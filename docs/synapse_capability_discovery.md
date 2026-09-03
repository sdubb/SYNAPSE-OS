# SYNAPSE-OS — CAPABILITY DISCOVERY & INTENT CATALOG

**Document**: `docs/synapse_capability_discovery.md`  
**Date**: 2026-09-03  
**Status**: Authoritative Product Specification  

---

## 1. Intent Discovery Architecture

When a new human arrives at SYNAPSE-OS with a goal, they should never be greeted by a blank prompt or cryptic command-line instructions. Synapse organizes its capabilities across 6 core domains:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        "TELL ME WHAT YOU WANT TO ACCOMPLISH"                           │
│                                                                                        │
│   [ 🛡️ Security ]   [ 🐛 Bug Repair ]   [ ⚡ Database ]   [ 🚀 Features ]   [ 🧪 Tests ]   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                       CLINE PROACTIVE INTELLIGENCE & ADVISOR                           │
│  "You asked to 'Clean up auth routes'. Synapse recommends:                             │
│   1. Inspect route guards in apps/backend/src/routes                                   │
│   2. Audit JWT token expiration & revocation checks                                    │
│   3. Refactor repeated validation logic into a shared middleware                       │
│   4. Run security regression test suite & verify SHA-256 evidence"                     │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         "YOU COULD ALSO ASK SYNAPSE TO..."                             │
│  • Check database queries for unindexed join bottlenecks                               │
│  • Simulate deployment in a Digital Twin sandbox before merging                        │
│  • Automatically generate integration tests for edge cases                             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Canonical Capability Domains & Actual Tool Mappings

Every capability listed below is backed by **REAL** underlying engines inside the SYNAPSE-OS repository. Zero mocks. Zero synthetic fabrications.

### Domain 1: CODE REPAIR & FEATURE DEVELOPMENT
| Capability | Real Tools Used | Typical DAG Sequence |
|---|---|---|
| **Fix a Bug** | `read_file`, `grep_search`, `replace_file_content`, `run_command` | 1. Reproduce with test command<br>2. Trace stack trace to source file<br>3. Surgical code edit<br>4. Re-run test to verify fix |
| **Refactor Code** | `read_file`, `replace_file_content`, `run_command` | 1. Identify duplication & loose types<br>2. Extract shared abstractions<br>3. Validate zero compiler diagnostics |
| **Add a Feature** | `write_to_file`, `replace_file_content`, `run_command` | 1. Define TypeScript interface contracts<br>2. Implement service layer<br>3. Add route endpoints<br>4. Write unit tests |
| **Review Code** | `read_file`, `grep_search`, `AuditEngine` | 1. Scan modified files<br>2. Check for anti-patterns & memory leaks<br>3. Generate review report |

---

### Domain 2: SECURITY & GOVERNANCE
| Capability | Real Tools Used | Typical DAG Sequence |
|---|---|---|
| **Audit Vulnerabilities** | `read_file`, `grep_search`, `SafetyPolicyPipeline` | 1. Scan for SQL injections & command injections<br>2. Verify input sanitization<br>3. Generate vulnerability report |
| **Review Authentication** | `read_file`, `replace_file_content` | 1. Audit JWT signing & expiration policies<br>2. Verify tenant isolation in request headers<br>3. Patch unauthenticated paths |
| **Harden Configuration** | `read_file`, `replace_file_content`, `SafetyEngine` | 1. Inspect CORS, helmet, and rate-limiting configs<br>2. Strengthen CSP & TLS headers<br>3. Verify security suite |

---

### Domain 3: DATABASE & DATA ARCHITECTURE
| Capability | Real Tools Used | Typical DAG Sequence |
|---|---|---|
| **Analyze Schema** | `read_file`, `SimulationEngine` | 1. Inspect table schemas & foreign key constraints<br>2. Detect missing composite indexes<br>3. Report query hotspots |
| **Generate Migration** | `write_to_file`, `run_command` | 1. Draft SQL migration script<br>2. Test idempotent up/down migrations<br>3. Verify schema integrity |
| **Simulate Query Load** | `DigitalTwin`, `SimulationEngine` | 1. Clone schema into isolated Twin<br>2. Run Monte Carlo latency simulation<br>3. Score violation risk |

---

### Domain 4: DEVOPS & SYSTEM RELIABILITY
| Capability | Real Tools Used | Typical DAG Sequence |
|---|---|---|
| **Diagnose Failure** | `read_file`, `run_command`, `EventBus` | 1. Inspect server logs & exception events<br>2. Isolate failing process or port conflict<br>3. Apply config repair |
| **Verify Production Build**| `run_command` | 1. Execute `bun run build`<br>2. Verify bundle size & zero TypeScript errors<br>3. Seal build proof |
| **Validate Isolation** | `ToolGateway`, `SafetyPolicyPipeline` | 1. Test cross-tenant access denial<br>2. Confirm path traversal defense<br>3. Record audit evidence |

---

### Domain 5: VERIFICATION & AUDIT
| Capability | Real Tools Used | Typical DAG Sequence |
|---|---|---|
| **Autonomous Test Generation** | `write_to_file`, `run_command` | 1. Uncover edge cases in exports<br>2. Construct realistic test suite<br>3. Run assertions to 100% green |
| **Cryptographic Evidence Audit** | `AuditEngine`, `EvidenceStore` | 1. Compute SHA-256 HMAC for each tool call<br>2. Verify Merkle root integrity<br>3. Generate tamper-evident proof |

---

## 3. Proactive "Next Best Action" Intelligence

When a user executes a mission, Synapse should not just stop when the primary task completes. It should proactively advise:

| When the User Asks For... | Synapse Proactively Recommends... |
|---|---|
| *"Fix bug in auth service"* | *"Would you also like me to run security regression tests and verify token expiration?"* |
| *"Refactor database queries"* | *"Would you like me to run a Monte Carlo simulation in the Digital Twin to verify query latency under load?"* |
| *"Add new API endpoint"* | *"Would you like me to generate comprehensive contract tests and update the OpenAPI specification?"* |
| *"Update configuration"* | *"Would you like me to verify that all tenant boundaries and CORS policies remain intact?"* |

All proactive suggestions are presented to the human for approval. **Recommendations NEVER execute autonomously without human confirmation.**
