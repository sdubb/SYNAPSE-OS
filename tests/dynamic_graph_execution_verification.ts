import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { ClineEngine, getGraphTools } from "@synapse/engine-adapter";
import { ExecutionGraphEngine } from "@synapse/control-plane";
import { ToolGateway } from "@synapse/tool-gateway";
import { SimulationEngine } from "@synapse/simulation-engine";
import { DigitalTwin } from "@synapse/twin-engine";
import { WorldModel, Entity, Relationship } from "@synapse/world-engine";
import crypto from "node:crypto";

describe("SYNAPSE-OS Dynamic Execution Graph Integration", () => {
  let engine: ClineEngine;
  let toolGateway: ToolGateway;
  let graphEngine: ExecutionGraphEngine;
  let simEngine: SimulationEngine;
  let twin: DigitalTwin;

  const tenantId = "tenant-e2e-graph";
  const agentId = "agent-planner";
  const missionId = "miss-checkout-fix";
  let sessionId: string;

  beforeAll(async () => {
    toolGateway = new ToolGateway({
      authorizationTokenTtlMs: 5000,
      enableEvidenceCapture: true,
      enableAuditLogging: true
    });

    graphEngine = new ExecutionGraphEngine({
      tenantId,
      missionId
    });

    simEngine = new SimulationEngine();
    
    // Explicit WorldModel as requested in step 15
    const model = new WorldModel(
      { id: "world-test", name: "Test World", tenantId, version: 1 },
      {
        entities: [
          new Entity({ id: "api", type: "Service", name: "API", state: { available: true } }),
          new Entity({ id: "gateway", type: "Service", name: "Gateway", state: { available: true } }),
          new Entity({ id: "database", type: "Database", name: "Database", state: { available: true, schemaVersion: "v1" } }),
          new Entity({ id: "worker", type: "Service", name: "Worker", state: { available: true } }),
        ],
        relationships: [
          new Relationship({ id: "rel1", sourceId: "api", targetId: "gateway", relationType: "DEPENDS_ON" }),
          new Relationship({ id: "rel2", sourceId: "gateway", targetId: "database", relationType: "DEPENDS_ON" }),
          new Relationship({ id: "rel3", sourceId: "worker", targetId: "database", relationType: "DEPENDS_ON" }),
        ],
        constraints: [],
        behaviors: []
      }
    );
    
    twin = new DigitalTwin({
      id: "twin-test",
      name: "Test Twin",
      targetSystemId: "test-env",
      primarySourceSystem: "sim",
      tenantId,
      baselineModel: model
    });

    engine = new ClineEngine({
      clientName: "synapse-test",
      toolGateway
    });
    
    await engine.initialize();
  });

  const getTwinFn = (env: string) => env === "production" ? twin : null;

  test("Graph Creation: Structured plan submitted via tool", async () => {
    // Simulate Cline evaluating the prompt and deciding to submit a plan via tool
    const submitTool = getGraphTools(graphEngine, simEngine, getTwinFn).find((t: any) => t.name === "submit_execution_plan");
    if (!submitTool) throw new Error("Tool not injected");
    
    const rawPlanPayload = {
      objective: "Fix checkout failure",
      nodes: [
        { id: "inspect_api", type: "ACTION", title: "Inspect API", expectedOutcome: "Determine API health" },
        { id: "api_decision", type: "BRANCH", title: "API Health Decision" },
        { id: "inspect_gateway", type: "ACTION", title: "Inspect Gateway" },
        { id: "inspect_database", type: "ACTION", title: "Inspect Database" },
        { id: "modify_code", type: "ACTION", title: "Modify Code", riskLevel: "HIGH" },
        { id: "approval", type: "APPROVAL", title: "Operator Approval" },
        { id: "verify", type: "VERIFICATION", title: "Run Tests" },
        { id: "human", type: "ESCALATION", title: "Escalate to Human" }
      ],
      edges: [
        { from: "inspect_api", to: "api_decision" },
        { from: "api_decision", to: "inspect_database", condition: "api.healthy == true" },
        { from: "api_decision", to: "inspect_gateway", condition: "api.healthy == false" },
        { from: "inspect_database", to: "modify_code" },
        { from: "modify_code", to: "approval" },
        { from: "approval", to: "verify" },
        { from: "verify", to: "human", condition: "verification.passed == false" }
      ]
    };

    const result = await submitTool.execute(rawPlanPayload, {} as any);
    expect(result).toContain("Plan successfully submitted");

    const graph = graphEngine.getGraph();
    expect(graph.nodes.length).toBe(8);
    expect(graph.edges.length).toBe(7);
  });

  test("Simulation: Branch evaluation does not mutate production twin", async () => {
    // Snapshot original twin
    const originalTwinState = JSON.stringify(twin);

    const simulateTool = getGraphTools(graphEngine, simEngine, getTwinFn).find((t: any) => t.name === "simulate_execution_branch");
    const simResultStr = await simulateTool.execute({
      targetNodeId: "modify_code",
      targetEntityId: "database",
      mutation: { 
        property: "errorRate",
        value: 15
      },
      actionType: "DATABASE_MIGRATION",
      environment: "production",
      expectedChange: "Schema mismatch causes errors",
      riskContext: "HIGH",
      iterations: 10
    }, {} as any);
    
    const simResult = JSON.parse(simResultStr as string);
    expect(simResult.outcomes.failureRate).toBeDefined();
    expect(simResult.blastRadius).toBeGreaterThanOrEqual(1);
    expect(simResult.affectedEntities).toBeGreaterThanOrEqual(1);

    // Verify isolation
    const postTwinState = JSON.stringify(twin);
    expect(postTwinState).toEqual(originalTwinState);
  });

  test("Graph Transition: Path changes dynamically based on context", () => {
    // 1. Initial State
    graphEngine.updateNodeState("inspect_api", "COMPLETED", { health: true });
    
    // 2. Evaluate Branch
    // Let's pretend API is healthy
    const nextNodesHealthy = graphEngine.getNextNodes("api_decision", { api: { healthy: true } });
    expect(nextNodesHealthy.length).toBe(1);
    expect(nextNodesHealthy[0].id).toBe("inspect_database");

    // 3. Evaluate Branch Alternate
    // Let's pretend API is unhealthy
    const nextNodesUnhealthy = graphEngine.getNextNodes("api_decision", { api: { healthy: false } });
    expect(nextNodesUnhealthy.length).toBe(1);
    expect(nextNodesUnhealthy[0].id).toBe("inspect_gateway");
  });

  test("Replanning: Fallback generates a new version", async () => {
    const replanTool = getGraphTools(graphEngine, simEngine, getTwinFn).find((t: any) => t.name === "propose_replan");
    const currentActiveVersion = graphEngine.getGraph().version;
    const result = await replanTool.execute({
      failedNodeId: "verify",
      reason: "Verification failed on production. Falling back to staging.",
      baseVersion: currentActiveVersion,
      newNodes: [
        { id: "rollback_db", type: "ACTION", title: "Rollback Database" },
        { id: "replan_eval", type: "ACTION", title: "Evaluate alternative approach" }
      ],
      newEdges: [
        { from: "verify", to: "rollback_db" },
        { from: "rollback_db", to: "replan_eval" }
      ]
    }, {} as any);

    expect(result).toContain("Replan accepted");
    
    const graph = graphEngine.getGraph();
    expect(graph.version).toBe(3);
    expect(graph.nodes.find(n => n.id === "rollback_db")).toBeDefined();
  });
  
  test("Escalation: Operator required when unresolved", () => {
    const escalation = graphEngine.escalate("human", "LEVEL_3", "Rollback failed, system unstable", {
      reason: "DB locked"
    });

    expect(escalation.status).toBe("PENDING");
    
    // Operator resolves it
    graphEngine.resolveEscalation(escalation.id, "RESOLVED", "user-123");
    
    const resolvedEscalation = graphEngine.getEscalation(escalation.id);
    expect(resolvedEscalation?.status).toBe("RESOLVED");
    expect(resolvedEscalation?.resolvedByUserId).toBe("user-123");
  });

  test("Immutability: Graph versions remain byte-for-byte stable", () => {
    // 1. Capture snapshot of V1
    const v1 = graphEngine.getGraph(1);
    const v1Snapshot = JSON.stringify(v1);

    // 2. Perform actions on V3 (current active)
    const currentActive = graphEngine.getGraph(); // currently V3
    graphEngine.updateNodeState(currentActive.nodes[0].id, "FAILED", { reason: "ImmTest" });

    // 3. Mutate V3 directly to test deep immutability against V1
    currentActive.nodes.push({
      id: "malicious_injection",
      type: "ACTION",
      title: "Hacked Node"
    });
    
    // 4. Create V4 via replan
    const v4 = graphEngine.replan([
      { id: "v4_node", type: "ACTION", title: "V4 Node" }
    ], [], "Testing immutability");

    // 5. Verify V1 is untouched and byte-for-byte identical
    const v1After = graphEngine.getGraph(1);
    const v1AfterSnapshot = JSON.stringify(v1After);

    expect(v1AfterSnapshot).toEqual(v1Snapshot);
    
    // Ensure the malicious node did not leak into V1
    expect(v1After.nodes.find(n => n.id === "malicious_injection")).toBeUndefined();
    // Ensure the V4 node is only in V4
    expect(v1After.nodes.find(n => n.id === "v4_node")).toBeUndefined();
    expect(v4.nodes.find(n => n.id === "v4_node")).toBeDefined();
  });

  test("Concurrency: Concurrent replans are safely rejected", () => {
    const currentVersion = graphEngine.getGraph().version;
    
    // First replan succeeds
    graphEngine.replan([{ id: "safe_node", type: "ACTION", title: "Safe" }], [], "First replan", currentVersion);
    
    // Second replan with stale version fails
    expect(() => {
      graphEngine.replan([{ id: "conflict_node", type: "ACTION", title: "Conflict" }], [], "Concurrent replan", currentVersion);
    }).toThrow(/Concurrency Conflict/);
  });

  test("Security: Safe DSL rejects prototype pollution and code execution", () => {
    const context = { api: { status: 200 } };
    const { ConditionEvaluator } = require("../packages/control-plane/src/graph/ConditionEvaluator.ts");
    
    // Prototype pollution attempt
    expect(ConditionEvaluator.evaluate("constructor.prototype.hacked == true", context)).toBe(false);
    expect(ConditionEvaluator.evaluate("__proto__.polluted == true", context)).toBe(false);

    // Code execution attempt
    expect(ConditionEvaluator.evaluate("process.exit(1)", context)).toBe(false);
    expect(ConditionEvaluator.evaluate("require('fs')", context)).toBe(false);
    
    // Legitimate evaluation works
    expect(ConditionEvaluator.evaluate("api.status == 200", context)).toBe(true);
  });
});


