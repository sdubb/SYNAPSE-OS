# SYNAPSE-OS — LIVE EXECUTION CALL GRAPH TRACE

## Execution Paradigm Invariant

```
CLINE THINKS.
SYNAPSE CONTROLS.
SIMULATION PREDICTS.
OBSERVATION DESCRIBES REALITY.
GRAPH DETERMINES THE EXECUTION FRONTIER.
TOOL GATEWAY CONTROLS EXECUTION.
HUMAN CAN INTERRUPT.
NOTHING BYPASSES SYNAPSE.
```

---

## Complete End-to-End Live Call Graph

This document details the exact, unbroken production call graph across all Synapse-OS packages and `@cline/core` engine adapter interfaces.

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Operator
    participant Cline as Cline Agent (Brain)
    participant Adapter as @synapse/engine-adapter (GraphTools / ClineEngine)
    participant ControlPlane as @synapse/control-plane (ExecutionGraphEngine)
    participant Store as @synapse/control-plane (FileGraphStore)
    participant Gateway as @synapse/tool-gateway (ToolGateway)
    participant Safety as @synapse/safety-engine (KillSwitch / RiskClassifier)
    participant Policy as @synapse/policy-engine (PolicyEngine)
    participant Approval as @synapse/approval-engine (ApprovalEngine)
    participant Sim as @synapse/simulation-engine (SimulationEngine)
    participant Twin as @synapse/twin-engine (DigitalTwin / WorldModel)
    participant Evidence as @synapse/evidence (EvidenceStore)
    participant Audit as @synapse/audit-engine (AuditEngine)

    User->>Cline: User Intent ("Perform database migration & verify")
    Cline->>Adapter: submit_execution_plan(objective, nodes, edges)
    Adapter->>ControlPlane: ExecutionGraphEngine.replan(nodes, edges, "Initial plan")
    ControlPlane->>ControlPlane: validateGraph(nodes, edges)
    ControlPlane->>Store: FileGraphStore.saveGraph(V1)
    ControlPlane->>Store: FileGraphStore.saveVersion(V1)
    ControlPlane-->>Adapter: ExecutionGraph (V1, Frontier=[node_1])
    Adapter-->>Cline: "Plan successfully submitted as V1"

    Note over Cline,ControlPlane: Frontier enforces node_1 is READY to execute

    Cline->>Adapter: requestToolApproval(read_file, {path: 'schema.prisma'})
    Adapter->>Gateway: evaluateAndAuthorizeToolCall(context)
    Gateway->>Safety: KillSwitch.isContextStopped()
    Gateway->>Safety: RiskClassifier.analyzeRisk()
    Gateway->>Policy: PolicyEngine.evaluatePolicy()
    Gateway->>Gateway: Issue HMAC-SHA256 AuthorizationToken
    Gateway-->>Adapter: { approved: true, authorizationToken }
    
    Cline->>Adapter: executeTool(read_file)
    Adapter->>Gateway: executeTool(context, executor, token)
    Gateway->>Gateway: validateAuthorizationToken(token, hash, callId)
    Gateway->>Gateway: consumeAuthorizationToken(tokenId)
    Gateway->>Evidence: EvidenceStore.storeEvidence(args, output, hash)
    Gateway->>Audit: AuditEngine.logSecurityEvent("tool.executed")
    Gateway-->>Adapter: ToolExecutionResult (output={schemaVersion: 'v2', tables: [...]})
    Adapter->>ControlPlane: recordObservation(provenance, output)
    ControlPlane->>Store: FileGraphStore.saveObservation(V1, observation)

    Note over ControlPlane: Observation populated authoritative GraphContext

    ControlPlane->>ControlPlane: ConditionEvaluator.evaluate("db.compatible == true")
    ControlPlane-->>Cline: Next frontier node [simulate_migration]

    Cline->>Adapter: simulate_execution_branch({targetEntityId: 'postgres_primary', mutation: {errorRate: 15}})
    Adapter->>Twin: getTwinFn("production")
    Twin-->>Adapter: DigitalTwin (isolated clone)
    Adapter->>Sim: SimulationEngine.runMonteCarloSweep(twinCopy, scenario, 20)
    Sim-->>Adapter: MonteCarloSweepResult (failureRate=80%, blastRadius=3, violations=2)
    Adapter-->>Cline: SimulationResult (structured predictive intelligence)

    Note over Cline: Cline reasons over simulation prediction & proposes safe alternative

    Cline->>Adapter: propose_replan({failedNodeId: 'run_migration', reason: 'High blast radius', baseVersion: 1, newNodes, newEdges})
    Adapter->>ControlPlane: ExecutionGraphEngine.replan(newNodes, newEdges, reason, baseVersion=1)
    ControlPlane->>ControlPlane: Verify baseVersion == activeVersion (OCC)
    ControlPlane->>ControlPlane: Deep clone V1 -> V2, validate new DAG
    ControlPlane->>Store: FileGraphStore.saveGraph(V2)
    ControlPlane->>Store: FileGraphStore.saveVersion(V2)
    ControlPlane-->>Adapter: ExecutionGraph (V2, Frontier=[staging_migration])
    Adapter-->>Cline: "Replan accepted. Graph version advanced to 2"

    Note over Cline,ControlPlane: Execution continues along V2 until verification succeeds
```

---

## Detailed Step-by-Step Function & Module Manifest

| Step | Subsystem | File / Module | Function / Method | Authoritative Responsibility |
|---|---|---|---|---|
| **1** | `@synapse/engine-adapter` | `packages/engine-adapter/src/graph/GraphTools.ts` | `createSubmitPlanTool.execute()` | Ingests initial Cline structured graph plan and delegates to control plane. |
| **2** | `@synapse/control-plane` | `packages/control-plane/src/graph/ExecutionGraphEngine.ts` | `ExecutionGraphEngine.replan()` | Validates DAG topology, creates deep-cloned immutable version, and advances graph state. |
| **3** | `@synapse/control-plane` | `packages/control-plane/src/graph/GraphStore.ts` | `FileGraphStore.saveGraph()` | Atomically persists graph snapshot and updates latest version pointer on disk. |
| **4** | `@synapse/control-plane` | `packages/control-plane/src/graph/ExecutionGraphEngine.ts` | `ExecutionGraphEngine.getFrontier()` | Computes legal, executable frontier nodes (in-degree 0, `QUEUED`/`CREATED`/`WAITING`). |
| **5** | `@synapse/engine-adapter` | `packages/engine-adapter/src/ClineEngine.ts` | `ClineEngine.handleClineToolApproval()` | Authoritative interception boundary. Prevents native tool execution prior to Synapse governance. |
| **6** | `@synapse/tool-gateway` | `packages/tool-gateway/src/ToolGateway.ts` | `ToolGateway.evaluateAndAuthorizeToolCall()` | Runs precedence pipeline (Multi-Tenant -> KillSwitch -> Risk -> Workspace -> Policy -> Capabilities -> Approvals). |
| **7** | `@synapse/safety-engine` | `packages/safety-engine/src/SafetyEngine.ts` | `SafetyEngine.analyzeRisk()` | Computes risk level, prompt injection risks, and blast radius factor scores. |
| **8** | `@synapse/policy-engine` | `packages/policy-engine/src/PolicyEngine.ts` | `PolicyEngine.evaluatePolicy()` | Evaluates tenant security boundaries, dangerous commands, and approval rules. |
| **9** | `@synapse/tool-gateway` | `packages/tool-gateway/src/ToolGateway.ts` | `ToolGateway.issueAuthorizationToken()` | Creates cryptographically signed HMAC-SHA256 token binding tenant, agent, session, and parameter hash. |
| **10** | `@synapse/engine-adapter` | `packages/engine-adapter/src/ClineEngine.ts` | `createGovernedExecutors.wrapper()` | Intercepts Cline execution invocation and forces execution through `ToolGateway.executeTool()`. |
| **11** | `@synapse/tool-gateway` | `packages/tool-gateway/src/ToolGateway.ts` | `ToolGateway.executeTool()` | Validates token signature, checks replay, executes tool, redacts secrets, seals evidence, and logs audit. |
| **12** | `@synapse/evidence` | `packages/evidence/src/EvidenceStore.ts` | `EvidenceStore.storeEvidence()` | Seals cryptographic Merkle evidence item containing execution parameters, output, and duration. |
| **13** | `@synapse/audit-engine` | `packages/audit-engine/src/AuditEngine.ts` | `AuditEngine.logSecurityEvent()` | Logs immutable audit entry chained with parent cryptographic hash. |
| **14** | `@synapse/control-plane` | `packages/control-plane/src/graph/ExecutionGraphEngine.ts` | `ExecutionGraphEngine.recordObservation()` | Converts verified tool output into trusted `OBSERVED_FACT`s with complete execution provenance. |
| **15** | `@synapse/control-plane` | `packages/control-plane/src/graph/ConditionEvaluator.ts` | `ConditionEvaluator.evaluate()` | Evaluates sandboxed DSL boolean conditions (`==`, `!=`, `>`, `<`, `AND`, `OR`, `NOT`, `()`) over trusted facts. |
| **16** | `@synapse/simulation-engine` | `packages/simulation-engine/src/SimulationEngine.ts` | `SimulationEngine.runMonteCarloSweep()` | Executes discrete-event simulation across isolated twin clone to predict failure rate and blast radius. |
| **17** | `@synapse/control-plane` | `packages/control-plane/src/graph/ExecutionGraphEngine.ts` | `ExecutionGraphEngine.replan()` | Applies Optimistic Concurrency Control (`baseVersion`), generates Graph V2, and isolates V1 snapshot. |

---

## 10 Mandatory Context Correlation IDs

Every live trace and tool execution context captured across Synapse-OS authoritatively carries and verifies all 10 correlation identifiers:

1. `tenantId`: Tenant isolation and workspace boundary identifier.
2. `missionId`: Top-level strategic objective correlation identifier.
3. `taskId`: Canonical DAG task identifier in the control plane state machine.
4. `runId`: Specific execution run identifier.
5. `attemptId`: Attempt counter within the active run.
6. `agentId`: Authoritative agent identity in the Agent Registry.
7. `graphId`: Unique persistent ExecutionGraph identifier.
8. `graphVersion`: Monotonically increasing immutable graph version number.
9. `runtimeId`: Sandboxed runtime instance identifier (Docker, Process, VM).
10. `clineSessionId`: Active Cline session stream correlation identifier.
