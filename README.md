# SYNAPSE-OS

<div align="center">

```
  ███████╗██╗   ██╗███╗   ██╗ █████╗ ██████╗ ███████╗███████╗      ██████╗ ███████╗
  ██╔════╝╚██╗ ██╔╝████╗  ██║██╔══██╗██╔══██╗██╔════╝██╔════╝     ██╔═══██╗██╔════╝
  ███████╗ ╚████╔╝ ██╔██╗ ██║███████║██████╔╝███████╗█████╗       ██║   ██║███████╗
  ╚════██║  ╚██╔╝  ██║╚██╗██║██╔══██║██╔═══╝ ╚════██║██╔══╝       ██║   ██║╚════██║
  ███████║   ██║   ██║ ╚████║██║  ██║██║     ███████║███████╗     ╚██████╔╝███████║
  ╚══════╝   ╚═╝   ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚══════╝╚══════╝      ╚═════╝ ╚══════╝
```

**The Enterprise-Grade Governed Operating System for Autonomous AI Agents**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Runtime: Bun](https://img.shields.io/badge/Runtime-Bun-black?logo=bun)](https://bun.sh)
[![Architecture: Zero-Trust](https://img.shields.io/badge/Architecture-Zero--Trust%20Governed-emerald)]()
[![Tests: 100% Verified](https://img.shields.io/badge/Tests-100%25%20Verified%20(7%2F7%20Suites)-brightgreen)]()

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Canonical Architecture](#-canonical-architecture)
- [Key Features](#-key-features)
- [Monorepo Structure](#-monorepo-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Quickstart](#-installation--quickstart)
- [Environment Configuration](#-environment-configuration)
- [Running the System](#-running-the-system)
- [Operator UI V3 Usage Guide](#-operator-ui-v3-usage-guide)
- [MCP External Agent Interoperability](#-mcp-external-agent-interoperability)
- [Verification & Test Suites](#-verification--test-suites)
- [Zero-Trust Security Model](#-zero-trust-security-model)
- [License](#-license)

---

## 🌟 Overview

**SYNAPSE-OS** is an enterprise-grade autonomous agent operating system designed to govern, observe, orchestrate, and audit autonomous AI cognitive runtimes.

In SYNAPSE-OS, **Cline is the primary cognitive brain**, while **SYNAPSE provides the authoritative operating system, identity, multi-tenant isolation, DAG execution frontier, and security boundaries**. Every physical tool execution (shell, filesystem, database, network) must cross the **ToolGateway**—the sole authoritative execution boundary—guaranteeing deterministic policy evaluation, human approval gating (*Needs You*), and immutable SHA-256 Merkle audit proof generation.

---

## 🏛️ Canonical Architecture

```text
               ┌────────────────────────────────────────────────────────┐
               │                     HUMAN OPERATOR                     │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                     SYNAPSE AUTH
                     [Native JWT Bearer + Tenant / Workspace RBAC]
                     [AES-256-GCM Encrypted Provider Credentials]
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │                      SYNAPSE OS                        │
               │   Authoritative Operating System · State · Governance  │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │                         CLINE                          │
               │                PRIMARY COGNITIVE BRAIN                 │
               │          Reasoning · Strategy · DAG Planning           │
               └───────────────────────────┬────────────────────────────┘
                                           │ tool requests
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │                      TOOLGATEWAY                       │
               │             SOLE AUTHORITATIVE BOUNDARY                │
               │      Precedence Levels 0–6 · HMAC Token Generation     │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                REAL EXECUTION & EVIDENCE
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │                  SYNAPSE OPERATOR UI                   │
               │                 MISSION COMMAND CENTER                 │
               └────────────────────────────────────────────────────────┘
```

### Architectural Roles

| Subsystem | Responsibility | Invariant Guarantee |
|---|---|---|
| **CLINE** | **Primary Cognitive Brain** | Owns cognitive reasoning, strategy, DAG generation, replanning, and tool call requests. Never executes tools directly. |
| **SYNAPSE OS** | **Operating System & Governance Kernel** | Owns identity, tenant/workspace isolation, DAG state, frontier calculation, approval gating, and policy evaluation. |
| **TOOLGATEWAY** | **Sole Execution Boundary** | Physical execution barrier enforcing 7 precedence levels and issuing ephemeral, non-replayable HMAC tokens. |
| **OPERATOR UI** | **Mission Command Center** | Real-time human command, steering, DAG inspection, approval resolution (*Needs You*), and cryptographic audit exploration. |
| **MCP SUBSYSTEM** | **Subordinate Worker Interoperability** | Streamable HTTP transport exposing 13 governed tools to external agents (Claude, Cursor, custom agents) through ToolGateway. |

---

## ✨ Key Features

- 🧠 **Cline Cognitive Primacy**: Embedded `@cline/core` runtime driving autonomous multi-step planning and dynamic DAG replanning.
- 🛡️ **ToolGateway 7-Level Safety Pipeline**:
  - **Level 0**: Multi-Tenant & Workspace Boundary Verification.
  - **Level 1**: Global Security Kill-Switch Emergency Interception.
  - **Level 2**: Human Approval Gating (*Needs You* Tray for High/Critical Risk actions).
  - **Level 3**: Workspace Sandbox & Path Traversal Containment.
  - **Level 4**: Granular Policy Engine Evaluation.
  - **Level 5**: Role-Based Capability Authorizer.
  - **Level 6**: Cryptographic HMAC-SHA256 Authorization Token Minting.
- 🔐 **Encrypted Provider Credential Store**:
  - Encrypted at rest in PostgreSQL with AES-256-GCM and PBKDF2 (100,000 iterations, SHA-512).
  - Runtime in-memory ephemeral resolution to Cline.
  - **Zero plaintext credentials exposed to browser**, logs, audit trails, or persistent state.
  - Full lifecycle support for key rotation, revocation, and connection verification.
- 📊 **Operator Command Center V3**:
  - **Mission Cockpit**: 3-zone flagship layout with interactive DAG graph, frontier highlighting, and node inspector.
  - **Workforce Kanban**: 7-column multi-agent distribution (`QUEUED` $\rightarrow$ `PLANNING` $\rightarrow$ `EXECUTING` $\rightarrow$ `WAITING` $\rightarrow$ `COMPLETED` $\rightarrow$ `BLOCKED` $\rightarrow$ `FAILED`).
  - **Needs You System**: Persistent notification drawer for human-in-the-loop approvals with 1-click decisions.
  - **Evidence Explorer**: Cryptographic SHA-256 Merkle chain inspector for proving every tool execution.
  - **Prediction vs Reality Visualizer**: Monte Carlo Digital Twin comparison metrics (Predicted vs Observed vs Accuracy).
  - **Global Command Palette**: `Ctrl+K` / `⌘K` deep search and instant command console.
- 🔌 **Hardened Multi-Client MCP Transport**:
  - Real `@modelcontextprotocol/sdk` Streamable HTTP transport.
  - Dedicated per-session `McpServer` instances supporting concurrent clients without transport collisions.
  - Cross-tenant session fixation defense (HTTP 403).
  - 13 real governed MCP tools with Optimistic Concurrency Control (OCC).
- 📜 **Tamper-Evident SHA-256 Audit Ledger**:
  - Cryptographically chained Merkle audit trail recording actor provenance, tool hashes, and execution evidence.

---

## 📦 Monorepo Structure

```text
.
├── apps/
│   ├── backend/        # Express REST API & Core Control Plane Gateway
│   ├── realtime/       # WebSocket Real-Time Event & Telemetry Hub (:3001)
│   ├── web/            # Synapse Operator UI V3 (React 18 + Vite + Tailwind)
│   └── worker/         # Background Queue & Task Worker Process
├── packages/
│   ├── control-plane/  # ExecutionGraphEngine, WorkforceGraphEngine, GraphStore
│   ├── engine-adapter/ # ClineEngine, ClineSession, SynapseMcpServer, McpTransport
│   ├── tool-gateway/   # ToolGateway, SafetyPolicyPipeline, CapabilityAuthorizer
│   ├── security/       # ProviderCredentialResolver, CredentialEncryption, RBAC
│   ├── approval-engine/# ApprovalEngine, ApprovalResolver, ApprovalAudit
│   ├── audit-engine/   # AuditWriter, AuditReader, AuditHasher (SHA-256 Merkle)
│   ├── simulation-engine/ # SimulationEngine, Scenario, Monte Carlo Runner
│   ├── twin-engine/    # DigitalTwin Environment Isolation
│   ├── world-engine/   # WorldModel Entity Dependency Graph
│   ├── database/       # Drizzle / PostgreSQL Schemas & Migration Engine
│   ├── contracts/      # Typed Zod Contracts & 18 Realtime Event Schemas
│   ├── event-bus/      # Distributed EventBus & Realtime Channels
│   ├── safety-engine/  # KillSwitch & RiskClassifier
│   └── tenancy/        # Multi-Tenant Scoping & Workspace Boundaries
├── docs/               # Comprehensive Forensic Audits, Traces & Architectural Specs
└── tests/              # 7 Complete Acceptance, Security, & Purity Test Suites
```

---

## 📋 Prerequisites

Ensure your environment meets the following requirements:

- **Runtime**: [Bun](https://bun.sh/) `>= 1.2.0` (Recommended) or [Node.js](https://nodejs.org/) `>= 20.0.0`
- **Database**: [PostgreSQL](https://www.postgresql.org/) `>= 15.0`
- **Operating System**: Linux, macOS, or Windows (WSL / PowerShell)

---

## 🚀 Installation & Quickstart

### 1. Clone the Repository

```bash
git clone https://github.com/sdubb/SYNAPSE-OS.git
cd SYNAPSE-OS
```

### 2. Install Monorepo Dependencies

```bash
bun install
```

### 3. Configure Environment Variables

Copy the example environment configuration:

```bash
cp .env.example .env
```

Edit `.env` to configure database and master encryption keys:

```env
# Server Configuration
PORT=3000
REALTIME_PORT=3001
MCP_PORT=3595
NODE_ENV=development

# Database Connection (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/synapse_os

# Security & Master Encryption Key (Must be 32+ characters / 256 bits)
SYNAPSE_CREDENTIAL_ENCRYPTION_KEY=your-secure-master-encryption-key-minimum-32-chars-256-bits
JWT_SECRET=your-secure-jwt-signing-secret-key-32-chars-min
SYNAPSE_TOKEN_SECRET=your-authoritative-hmac-sha256-minting-secret

# Workspace Storage
SYNAPSE_DATA_DIR=./.synapse_data
```

### 4. Initialize Database Schema

```bash
bun run db:migrate
```

---

## 🏃 Running the System

### Start All Services (Development Mode)

```bash
bun run dev
```

This launches:
- 🌐 **Synapse Operator UI**: `http://localhost:5173`
- ⚙️ **Synapse REST Backend**: `http://localhost:3000`
- 📡 **Realtime WebSocket Fabric**: `ws://localhost:3001`
- 🔌 **Streamable HTTP MCP Server**: `http://localhost:3595/mcp`

### Build for Production

```bash
bun run build
```

---

## 🖥️ Operator UI V3 Usage Guide

### 1. Authentication & Tenant Scope
1. Navigate to `http://localhost:5173/login`.
2. Authenticate using your credentials or admin key. Synapse Auth will mint a tenant-scoped JWT bearer token.

### 2. Configure LLM Provider Credentials
1. Go to **Settings $\rightarrow$ Provider Credentials** (`/settings/providers`).
2. Add your **Anthropic**, **OpenRouter**, or **OpenAI** API key.
3. The key is encrypted client-side over HTTPS and saved as AES-256-GCM ciphertext (`salt:iv:authTag:ciphertext`).
4. Click **Test Connection** to verify provider connectivity without exposing the key to the browser.

### 3. Launching an Autonomous Mission
1. Open the **Command Center** (`/missions`) or press `Ctrl+K` to open the Command Palette.
2. Select **Start Mission**, enter your objective (e.g., *"Audit database schema and propose zero-downtime sharding migration"*), and select your workspace.
3. **Cline (Primary Cognitive Brain)** parses the objective, creates an initial DAG, and submits Graph V1 to Synapse.

### 4. Monitoring the Mission Cockpit
1. Open the mission to enter the **3-Zone Mission Cockpit** (`/missions/:id`):
   - **Left Panel**: Mission metadata, elapsed time, DAG version, and risk indicator.
   - **Center DAG**: Interactive execution graph showing completed, running, and frontier nodes. Click any node to open the **Node Inspector** for tool arguments and evidence.
   - **Right Panel**: Contextual command panel displaying Cline's active reasoning state, token usage, and live cost ticker.

### 5. Handling Human Governance (*Needs You*)
1. When Cline requests a destructive or high-risk tool (e.g., `execute_sql`, `truncate_table`), ToolGateway intercepts the call at Precedence Level 2.
2. The **Needs You** badge pulses in the top bar.
3. Open the **Needs You Action Center** to inspect the tool arguments, risk evaluation, and parameters.
4. Click **Approve** (mints a single-use HMAC token and executes the tool) or **Reject** (returns a policy rejection to Cline, prompting replanning).

### 6. Exploring Cryptographic Evidence
1. Open the **Evidence Explorer** (`/audit`).
2. Search and filter by mission or tool name.
3. Inspect the SHA-256 Merkle chain verification to cryptographically prove execution integrity.

---

## 🔌 MCP External Agent Interoperability

External agents (Claude Desktop, Cursor, external autonomous workers) can connect to SYNAPSE-OS over Streamable HTTP:

### MCP Server Endpoint
`http://localhost:3595/mcp`

### Supported Governed Tools (13/13)

| MCP Tool Name | Description | Governance Authority |
|---|---|---|
| `inspect_execution_graph` | Read-only inspection of active mission DAG | Synapse Control-Plane |
| `inspect_frontier` | Read-only query of executable frontier nodes | ExecutionGraphEngine |
| `submit_execution_plan` | Submit new DAG plan with OCC validation | ToolGateway + GraphStore |
| `propose_replan` | Replan failed nodes with OCC conflict check | ExecutionGraphEngine |
| `request_simulation` | Run Monte Carlo scenario on Digital Twin | SimulationEngine |
| `inspect_workforce` | Query multi-agent workforce hierarchy | WorkforceGraphEngine |
| `request_agent_spawn` | Governed subagent spawn request | WorkforceGraphEngine |
| `request_approval` | Request human approval for high-risk action | ApprovalEngine |
| `request_escalation` | Escalate blocker to human operator (Level 1–4) | ExecutionGraphEngine |
| `inspect_mission` | Query mission status, duration, and metrics | FileGraphStore |
| `report_observation` | Record validated `OBSERVED_FACT` with provenance | ExecutionGraphEngine |
| `inspect_observations` | Query recorded facts and observations | FileGraphStore |
| `inspect_audit_events` | Query tamper-proof SHA-256 audit ledger | AuditEngine |

---

## 🧪 Verification & Test Suites

SYNAPSE-OS includes 7 comprehensive automated test suites verifying all security, isolation, and governance invariants:

```bash
# 1. Final Architecture Purity Suite (14 Invariants)
bun run ./tests/synapse_architecture_purity_suite.ts

# 2. Operator UI V3 Product Superiority Suite (13 Tests)
bun run ./tests/operator_product_superiority_suite.ts

# 3. Frontend-Backend Contract Guardian Suite (31 Tests)
bun run ./tests/operator_frontend_backend_contract_suite.ts

# 4. Provider Credential & Cline Autonomy E2E Suite (12 Tests)
bun run ./tests/provider_cline_e2e_real_acceptance.ts

# 5. MCP Multi-Client Hardening Suite (18 Tests)
bun run ./tests/mcp_multi_client_hardening_suite.ts

# 6. Provider Credential Security & Isolation Suite (39 Tests)
bun run ./tests/provider_credential_isolation_suite.ts

# 7. Operator UI Adversarial Verification Suite (12 Tests)
bun run ./tests/operator_ui_v2_full_adversarial_audit.ts
```

### Run All 7 Test Suites Concurrently

```bash
bun test:all
```

---

## 🔒 Zero-Trust Security Model

1. **Zero Direct Execution**: Cline and MCP agents cannot execute commands or access the filesystem directly; all operations must pass through ToolGateway.
2. **Zero Plaintext Key Exposure**: Provider secrets are stored as AES-256-GCM ciphertext, decrypted ephemerally in backend memory only during LLM API calls, and never exposed to the frontend.
3. **Single-Use HMAC Tokens**: Physical execution requires an HMAC-SHA256 token derived from `(toolName, argumentsHash, tenantId, callId, expiresAt)`. Tokens expire in 30 seconds and cannot be replayed.
4. **Strict Multi-Tenant Isolation**: Database queries, WebSocket subscriptions, file sandboxes, and MCP transports enforce strict tenant ID matching at the kernel level.

---

## 📄 License

SYNAPSE-OS is open-source software licensed under the **[Apache License, Version 2.0](LICENSE)**.

```text
Copyright 2026 SYNAPSE-OS Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
