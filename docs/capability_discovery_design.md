# SYNAPSE-OS — CAPABILITY DISCOVERY & INTENT DESIGN

**Document**: `docs/capability_discovery_design.md`  
**Date**: 2026-09-01  
**Classification**: Operator UX & Intelligence Design  

---

## 1. Capability Discovery Architecture

When an operator lands on SYNAPSE-OS, they should immediately know what the system can do for them without reading documentation.

```text
┌────────────────────────────────────────────────────────┐
│                   HUMAN USER ARRIVES                   │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
  [Preset Capability Cards]        [Natural Language Prompt]
  • Security Vulnerability Audit   • "Fix my authentication..."
  • Bug Diagnosis & Patching       • "Optimize database queries..."
  • Database & SQL Optimization    • "Build an API endpoint..."
  • Feature Implementation         • "Write missing test cases..."
  • Autonomous Test Suite Gen      • "Clean up code duplication..."
  • Code Refactoring & Typing      • "Investigate failing builds..."
            │                               │
            └───────────────┬───────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│             CLINE DECOMPOSITION & PLAN ADVISOR         │
│  1. Analyzes scope & files                             │
│  2. Formulates sequenced DAG milestones               │
│  3. Recommends tests, validations, & risk tiers        │
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│            HUMAN REVIEWS & CUSTOMIZES PLAN             │
│  (Add steps, delete steps, adjust risk, 1-click launch)│
└────────────────────────────────────────────────────────┘
```

---

## 2. The 6 Core Supported Capabilities

| Capability Preset | Underlying Engine / Tools | Typical DAG Sequence |
|---|---|---|
| **1. Security & Vulnerability Audit** | `read_file`, `grep_search`, `SafetyPolicyPipeline` | 1. Scan endpoints $\rightarrow$ 2. Identify unauthenticated paths $\rightarrow$ 3. Generate patch $\rightarrow$ 4. Regression test |
| **2. Bug Diagnosis & Targeted Repair** | `run_command`, `read_file`, `replace_file_content` | 1. Run test suite $\rightarrow$ 2. Trace stack traces $\rightarrow$ 3. Surgical code edit $\rightarrow$ 4. Verify test pass |
| **3. Database & SQL Performance** | `DigitalTwin`, `SimulationEngine`, `execute_sql` | 1. Analyze schema $\rightarrow$ 2. Find missing indexes $\rightarrow$ 3. Write migration $\rightarrow$ 4. Benchmark latency |
| **4. Feature Implementation & API** | `write_to_file`, `replace_file_content`, `run_command` | 1. Define schema types $\rightarrow$ 2. Service logic $\rightarrow$ 3. Controller routes $\rightarrow$ 4. Contract test |
| **5. Autonomous Test Suite Gen** | `run_command`, `write_to_file`, `AuditEngine` | 1. Uncover edge cases $\rightarrow$ 2. Build test suite $\rightarrow$ 3. Execute assertions $\rightarrow$ 4. Seal evidence hash |
| **6. Code Refactoring & Typing** | `read_file`, `replace_file_content`, `run_command` | 1. Find type gaps $\rightarrow$ 2. Extract shared modules $\rightarrow$ 3. Typecheck build $\rightarrow$ 4. Verify test suite |

---

## 3. Human Task Advisor Behavior

When a human states an intent:
1. **Intelligent Decomposition**: Deconstructs high-level intent into 3–5 actionable, sequenced steps.
2. **Proactive Safety Warnings**: Identifies potentially destructive operations (e.g. database schema migrations) and assigns appropriate risk badges (`MEDIUM`, `HIGH`, `CRITICAL`).
3. **Simulation Advice**: For high-risk operations, recommends running a Monte Carlo simulation in the Digital Twin sandbox prior to live execution.
4. **No Fabricated Fallbacks**: Every proposed tool action maps directly to a physical ToolGateway capability.
