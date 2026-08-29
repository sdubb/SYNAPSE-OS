import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { ClineEngine, getGraphTools } from "@synapse/engine-adapter";
import { ExecutionGraphEngine } from "@synapse/control-plane";
import { ToolGateway } from "@synapse/tool-gateway";
import crypto from "node:crypto";

describe("SYNAPSE-OS Dynamic Execution Graph Integration", () => {
  let engine: ClineEngine;
  let toolGateway: ToolGateway;
  let graphEngine: ExecutionGraphEngine;

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

    engine = new ClineEngine({
      clientName: "synapse-test",
      toolGateway
    });
    
    await engine.initialize();
  });

  test("Graph Creation: Structured plan submitted via tool", async () => {
    // Simulate Cline evaluating the prompt and deciding to submit a plan via tool
    const submitTool = getGraphTools(graphEngine).find((t: any) => t.name === "submit_execution_plan");
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

  test("Simulation: Branch evaluation recommends safe paths", async () => {
    const simulateTool = getGraphTools(graphEngine).find((t: any) => t.name === "simulate_execution_branch");
    const simResultStr = await simulateTool.execute({
      scenario: "database schema is wrong",
      proposedAction: "modify_code (schema change)"
    }, {} as any);
    
    const simResult = JSON.parse(simResultStr as string);
    expect(simResult.outcomes.failureRate).toBeDefined();
    expect(simResult.recommendedBranch).toContain("staging migration");
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
    const replanTool = getGraphTools(graphEngine).find((t: any) => t.name === "propose_replan");
    
    const result = await replanTool.execute({
      failedNodeId: "verify",
      reason: "Tests failed after database modification",
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
});


